import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import messages from "@/messages/en.json";
import SettingsPage from "@/app/[locale]/(protected)/settings/page";

const { routerPushMock, routerRefreshMock, signOutMock, fetchMock } = vi.hoisted(
  () => ({
    routerPushMock: vi.fn(),
    routerRefreshMock: vi.fn(),
    signOutMock: vi.fn(),
    fetchMock: vi.fn(),
  })
);

function getNestedValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

function interpolate(message: string, values?: Record<string, string | number>) {
  if (!values) {
    return message;
  }

  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, message);
}

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace?: string) => {
    const root = namespace
      ? (getNestedValue(messages as Record<string, unknown>, namespace) as Record<string, unknown>)
      : (messages as Record<string, unknown>);

    const translate = (path: string, values?: Record<string, string | number>) => {
      const value = getNestedValue(root, path);

      if (typeof value !== "string") {
        throw new Error(`Missing translation for ${namespace ?? "root"}:${path}`);
      }

      return interpolate(value, values);
    };

    translate.raw = (path: string) => getNestedValue(root, path);

    return translate;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "user_123",
        name: "Sistine Builder",
        email: "builder@example.com",
        emailVerified: true,
      },
    },
  }),
  signOut: signOutMock,
}));

vi.mock("@/components/background", () => ({
  Background: () => <div data-testid="settings-background" />,
}));

vi.mock("@/components/container", () => ({
  Container: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag) => {
        return ({
          children,
          initial,
          animate,
          transition,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>) => {
          void initial;
          void animate;
          void transition;
          return React.createElement(
            typeof tag === "string" ? tag : "div",
            props,
            children
          );
        };
      },
    }
  ),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: "user_123",
          name: "Sistine Builder",
          email: "builder@example.com",
          emailVerified: true,
          credits: 420,
          createdAt: "2025-01-01T00:00:00.000Z",
          subscription: {
            planKey: "starter_monthly",
            status: "active",
            currentPeriodEnd: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders profile, billing, and security controls from live user data", async () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Sistine Builder")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sistine Builder")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument();
    expect(screen.getByText("Starter Monthly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage credits" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View pricing" })).toBeInTheDocument();
  });

  it("saves the updated profile name through the authenticated profile route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: "user_123",
          name: "Updated Builder",
          email: "builder@example.com",
          emailVerified: true,
          credits: 420,
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      }),
    });

    render(<SettingsPage />);

    const input = await screen.findByLabelText("Display name");
    await screen.findByDisplayValue("Sistine Builder");
    fireEvent.change(input, {
      target: {
        value: "  Updated    Builder  ",
      },
    });
    await waitFor(() => {
      expect(input).toHaveValue("  Updated    Builder  ");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/user/profile");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalled();
  });
});
