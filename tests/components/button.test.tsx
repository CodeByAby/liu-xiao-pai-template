import { render, screen } from "@testing-library/react";
import { Button } from "@/components/button";

describe("Button", () => {
  it("renders the default CTA when children are omitted", () => {
    render(<Button />);

    expect(
      screen.getByRole("button", {
        name: "Get Started",
      })
    ).toBeInTheDocument();
  });

  it("applies variant and size classes while preserving custom className", () => {
    render(
      <Button className="tracking-wide" size="lg" variant="outline">
        Upgrade
      </Button>
    );

    const button = screen.getByRole("button", { name: "Upgrade" });

    expect(button).toHaveClass("tracking-wide");
    expect(button).toHaveClass("text-base");
    expect(button).toHaveClass("hover:bg-primary");
  });

  it("supports polymorphic rendering through the as prop", () => {
    render(
      <Button as="a" href="/pricing">
        Pricing
      </Button>
    );

    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing"
    );
  });
});
