import { createCreditCompensation } from "@/lib/credit-compensation";

describe("createCreditCompensation", () => {
  it("refunds credits once when compensation is triggered", async () => {
    const refund = vi.fn().mockResolvedValue({
      success: true,
      remainingCredits: 120,
    });

    const compensation = createCreditCompensation(
      {
        userId: "user-1",
        amount: 20,
        reason: "image_generation_refund",
        referenceId: "history-1",
      },
      { refund }
    );

    await compensation.compensate();
    await compensation.compensate();

    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund).toHaveBeenCalledWith(
      "user-1",
      20,
      "image_generation_refund",
      "history-1"
    );
  });

  it("does not refund after a charge has been settled", async () => {
    const refund = vi.fn().mockResolvedValue({
      success: true,
      remainingCredits: 120,
    });

    const compensation = createCreditCompensation(
      {
        userId: "user-1",
        amount: 10,
        reason: "chat_usage_refund",
        referenceId: "chat-1",
      },
      { refund }
    );

    compensation.settle();
    const result = await compensation.compensate();

    expect(result).toBe(false);
    expect(refund).not.toHaveBeenCalled();
  });
});
