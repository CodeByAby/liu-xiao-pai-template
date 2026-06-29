import {
  getSubscriptionPlanTranslationKey,
  normalizeProfileName,
  updateProfileSchema,
} from "@/lib/account-settings";

describe("account settings helpers", () => {
  it("normalizes profile names before saving them", () => {
    expect(normalizeProfileName("  Sistine    Builder  ")).toBe("Sistine Builder");
  });

  it("rejects names that are too short after trimming", () => {
    const result = updateProfileSchema.safeParse({
      name: " a ",
    });

    expect(result.success).toBe(false);
  });

  it("maps known subscription plans to existing translation keys", () => {
    expect(getSubscriptionPlanTranslationKey("starter_monthly")).toBe("starterMonthly");
    expect(getSubscriptionPlanTranslationKey("starter_yearly")).toBe("starterYearly");
    expect(getSubscriptionPlanTranslationKey("pro_monthly")).toBe("proMonthly");
    expect(getSubscriptionPlanTranslationKey("pro_yearly")).toBe("proYearly");
    expect(getSubscriptionPlanTranslationKey()).toBe("free");
  });
});
