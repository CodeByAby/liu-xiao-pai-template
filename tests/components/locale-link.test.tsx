import { render, screen } from "@testing-library/react";
import { LocaleLink } from "@/components/locale-link";

const useLocaleMock = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => useLocaleMock(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("LocaleLink", () => {
  beforeEach(() => {
    useLocaleMock.mockReturnValue("en");
  });

  it("prefixes internal links with the active locale", () => {
    render(<LocaleLink href="/pricing">Pricing</LocaleLink>);

    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/en/pricing"
    );
  });

  it("does not double-prefix links that already include the locale", () => {
    render(<LocaleLink href="/en/blog">Blog</LocaleLink>);

    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "href",
      "/en/blog"
    );
  });

  it("passes external urls through unchanged", () => {
    render(<LocaleLink href="https://mksaas.com">External</LocaleLink>);

    expect(screen.getByRole("link", { name: "External" })).toHaveAttribute(
      "href",
      "https://mksaas.com"
    );
  });

  it("passes new-tab attributes through to the rendered link", () => {
    render(
      <LocaleLink href="/docs" target="_blank" rel="noopener noreferrer">
        Docs
      </LocaleLink>
    );

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/en/docs"
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "target",
      "_blank"
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
  });
});
