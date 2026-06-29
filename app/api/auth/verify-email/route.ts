import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, verification } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Log for debugging
    console.log("Verifying token:", token);
    
    // First, try to find the verification token
    const verificationRecord = await db
      .select()
      .from(verification)
      .where(
        eq(verification.value, token)
      )
      .limit(1);
    
    console.log("Verification record found:", verificationRecord);

    // If no record found, check if it's because the user is already verified
    if (!verificationRecord || verificationRecord.length === 0) {
      // Token not found - could be already used or invalid
      // Let's be more user-friendly with the error message
      return NextResponse.json(
        { 
          success: false, 
          error: "This verification link has already been used or is invalid. If your email is already verified, you can proceed to login." 
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    const record = verificationRecord[0];
    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if it's an email verification token
    if (record.identifier !== "email-verification") {
      return NextResponse.json(
        { success: false, error: "Invalid verification token type" },
        { status: 400 }
      );
    }
    
    // Extract user ID from verification record
    // The ID format should be "email-verification:userId"
    const parts = record.id.split(":");
    const userId = parts.length > 1 ? parts[1] : parts[0];

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid verification token format" },
        { status: 400 }
      );
    }

    // Update user's email verification status
    await db
      .update(user)
      .set({ 
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(user.id, userId));

    // Delete the used verification token
    await db
      .delete(verification)
      .where(eq(verification.id, record.id));

    // Return success response (not redirect, as this is called via fetch)
    return NextResponse.json(
      { success: true, message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}
