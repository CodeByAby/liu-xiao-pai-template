import { refundCredits } from "@/lib/credits";

type RefundHandler = typeof refundCredits;

type CreditCompensationParams = {
  amount: number;
  reason: string;
  referenceId?: string;
  userId: string;
};

type CreditCompensationDeps = {
  refund?: RefundHandler;
};

export function createCreditCompensation(
  { amount, reason, referenceId, userId }: CreditCompensationParams,
  deps: CreditCompensationDeps = {}
) {
  const refund = deps.refund ?? refundCredits;
  let settled = false;

  return {
    settle() {
      settled = true;
    },
    async compensate() {
      if (settled) {
        return false;
      }

      settled = true;

      const result = await refund(userId, amount, reason, referenceId);
      if (!result.success) {
        console.error("[Credits] Failed to compensate credits", {
          amount,
          reason,
          referenceId,
          userId,
        });
      }

      return result.success;
    },
  };
}
