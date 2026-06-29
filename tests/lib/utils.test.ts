import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges truthy class names", () => {
    expect(cn("px-4", false && "hidden", "py-2")).toBe("px-4 py-2");
  });

  it("lets tailwind-merge resolve conflicting utilities", () => {
    expect(cn("px-2", "px-6", "text-sm", "text-lg")).toBe("px-6 text-lg");
  });
});
