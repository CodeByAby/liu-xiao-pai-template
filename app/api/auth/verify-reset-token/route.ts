import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { passwordResetToken } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // Hash the token to match what's in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid token
    const validToken = await db
      .select()
      .from(passwordResetToken)
      .where(
        and(
          eq(passwordResetToken.token, hashedToken),
          gt(passwordResetToken.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!validToken || validToken.length === 0) {
      return NextResponse.json(
        { valid: false, message: "Invalid or expired token" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { valid: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}