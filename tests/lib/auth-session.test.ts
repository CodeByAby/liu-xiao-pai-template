import { isBanActive, resolveSessionAccess } from "@/lib/auth/session";

describe("auth session access", () => {
  it("treats permanent bans as active", () => {
    expect(
      isBanActive({
        banned: true,
        banExpires: null,
      })
    ).toBe(true);
  });

  it("ignores expired temporary bans", () => {
    expect(
      isBanActive(
        {
          banned: true,
          banExpires: new Date("2025-01-01T00:00:00.000Z"),
        },
        {
          now: new Date("2025-02-01T00:00:00.000Z"),
        }
      )
    ).toBe(false);
  });

  it("blocks banned users from active sessions", () => {
    expect(
      resolveSessionAccess({
        id: "user-1",
        banned: true,
        banExpires: null,
        emailVerified: true,
        role: "user",
      })
    ).toEqual({
      ok: false,
      error: "User is banned",
      status: 403,
    });
  });

  it("allows active users through", () => {
    expect(
      resolveSessionAccess({
        id: "user-1",
        banned: false,
        banExpires: null,
        emailVerified: true,
        role: "user",
      })
    ).toEqual({
      ok: true,
      user: {
        id: "user-1",
        banned: false,
        banExpires: null,
        emailVerified: true,
        role: "user",
      },
    });
  });
});
