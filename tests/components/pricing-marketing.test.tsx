import { render, screen } from "@testing-library/react";
import pricingMessages from "@/messages/en.json";
import { Pricing } from "@/components/pricing";
import { PricingTable } from "@/app/[locale]/(marketing)/pricing/pricing-table";

const routerPushMock = vi.fn();

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
  useTranslations: () => {
    const translate = (path: string, values?: Record<string, string | number>) => {
      const value = getNestedValue(pricingMessages.pricing as Record<string, unknown>, path);

      if (typeof value !== "string") {
        throw new Error(`Missing translation for ${path}`);
      }

      return interpolate(value, values);
    };

    translate.raw = (path: string) =>
      getNestedValue(pricingMessages.pricing as Record<string, unknown>, path);

    return translate;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: {
      user: null,
    },
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    span: ({
      children,
      layoutId,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & { layoutId?: string }
    >) => {
      void layoutId;
      return <span {...props}>{children}</span>;
    },
  },
}));

describe("marketing pricing", () => {
  it("renders only the configured plans on the pricing cards", () => {
    render(<Pricing />);

    expect(screen.getByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Credits Pack" })).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument();
    expect(screen.getByText("$99")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
    expect(screen.queryByText("Professional")).not.toBeInTheDocument();
  });

  it("keeps the comparison table aligned with the real billing catalog", () => {
    render(<PricingTable />);

    expect(screen.getByRole("columnheader", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Credits Pack" })).toBeInTheDocument();
    expect(screen.getByText("1,000 / month")).toBeInTheDocument();
    expect(screen.getByText("10,000 / month")).toBeInTheDocument();
    expect(screen.getByText("200 once")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Free" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Enterprise" })).not.toBeInTheDocument();
  });
});
