import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creditLedger } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    // Get session from Better Auth
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const userId = access.user.id;
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch credit history
    const history = await db
      .select({
        id: creditLedger.id,
        userId: creditLedger.userId,
        delta: creditLedger.delta,
        reason: creditLedger.reason,
        paymentId: creditLedger.paymentId,
        createdAt: creditLedger.createdAt,
      })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: creditLedger.id })
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));
    
    const totalCount = countResult.length;

    // Format the response (return reason for i18n on client side)
    const formattedHistory = history.map(record => {
      // Determine the type based on reason
      let type = "";
      
      switch(record.reason) {
        case "subscription_cycle":
        case "subscription_schedule":
          type = "subscription";
          break;
        case "one_time_pack":
          type = "purchase";
          break;
        case "chat_usage":
        case "video_generation":
        case "image_generation":
          type = "usage";
          break;
        case "refund":
        case "chat_usage_refund":
        case "image_generation_refund":
        case "video_generation_refund":
          type = "refund";
          break;
        case "adjustment":
          type = "adjustment";
          break;
        default:
          type = "other";
      }

      return {
        id: record.id,
        amount: record.delta,
        type,
        reason: record.reason,
        createdAt: record.createdAt,
        paymentId: record.paymentId,
      };
    });

    return NextResponse.json({
      history: formattedHistory,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
