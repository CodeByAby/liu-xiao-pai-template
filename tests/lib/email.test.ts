import { getResendClient, sendEmail } from "@/lib/email";

describe("email client", () => {
  it("does not construct a resend client when the API key is missing", () => {
    expect(getResendClient(undefined)).toBeNull();
  });

  it("returns a controlled error instead of throwing when email is disabled", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    try {
      await expect(
        sendEmail({
          to: "user@example.com",
          subject: "Hello",
          html: "<p>Test</p>",
        })
      ).resolves.toMatchObject({
        success: false,
      });
    } finally {
      if (originalKey) {
        process.env.RESEND_API_KEY = originalKey;
      }
    }
  });
});
