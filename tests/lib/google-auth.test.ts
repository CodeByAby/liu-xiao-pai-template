import { getGoogleAuthProvider, isGoogleAuthEnabled } from "@/lib/auth/google-auth";

describe("google auth config", () => {
  it("enables Google auth only when both credentials are present", () => {
    expect(
      isGoogleAuthEnabled({
        AUTH_GOOGLE_ID: "client-id",
        AUTH_GOOGLE_SECRET: "client-secret",
      }),
    ).toBe(true);

    expect(
      isGoogleAuthEnabled({
        AUTH_GOOGLE_ID: "client-id",
      }),
    ).toBe(false);

    expect(
      isGoogleAuthEnabled({
        AUTH_GOOGLE_SECRET: "client-secret",
      }),
    ).toBe(false);
  });

  it("trims credentials and returns a provider config only when complete", () => {
    expect(
      getGoogleAuthProvider({
        AUTH_GOOGLE_ID: "  client-id  ",
        AUTH_GOOGLE_SECRET: "  client-secret  ",
      }),
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    expect(
      getGoogleAuthProvider({
        AUTH_GOOGLE_ID: "client-id",
        AUTH_GOOGLE_SECRET: "   ",
      }),
    ).toBeNull();
  });
});
