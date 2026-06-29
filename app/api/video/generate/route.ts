export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generationHistory } from "@/lib/db/schema";
import { canUserAfford, deductCredits } from "@/lib/credits";
import { volcanoEngine } from "@/lib/volcano-engine";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { createCreditCompensation } from "@/lib/credit-compensation";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/error-utils";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const userId = access.user.id;

    // Parse request body
    const { prompt, imageUrl, duration, resolution, watermark } = await req.json();

    if (!prompt && !imageUrl) {
      return NextResponse.json({ 
        error: "Either prompt or imageUrl is required" 
      }, { status: 400 });
    }

    // Check if user has enough credits (50 credits for video generation)
    const creditsNeeded = 50;
    const hasCredits = await canUserAfford(userId, creditsNeeded);
    if (!hasCredits) {
      return NextResponse.json({ 
        error: "Insufficient credits", 
        creditsNeeded,
        remainingCredits: 0 
      }, { status: 402 });
    }

    // Create generation history entry
    const historyId = randomUUID();
    await db.insert(generationHistory).values({
      id: historyId,
      userId,
      type: "video",
      prompt: prompt || "Image to video generation",
      imageUrl,
      status: "pending",
      creditsUsed: creditsNeeded,
      metadata: JSON.stringify({ duration, resolution, watermark }),
    });

    // Deduct credits
    const deductResult = await deductCredits(userId, creditsNeeded, "video_generation", historyId);
    if (!deductResult.success) {
      // Update history to failed
      await db.update(generationHistory)
        .set({ status: "failed", error: deductResult.error })
        .where(eq(generationHistory.id, historyId));
      
      return NextResponse.json({ 
        error: deductResult.error || "Failed to deduct credits",
        remainingCredits: deductResult.remainingCredits 
      }, { status: 402 });
    }

    const compensation = createCreditCompensation({
      userId,
      amount: creditsNeeded,
      reason: "video_generation_refund",
      referenceId: historyId,
    });

    try {
      // Generate video
      let result;
      if (imageUrl) {
        // If image URL is provided, use image-to-video generation
        result = await volcanoEngine.generateVideoFromImage(
          imageUrl, 
          prompt || "Generate video from image",  // Provide default prompt if not specified
          { duration, resolution, watermark }
        );
      } else if (prompt) {
        // Only use text-to-video if prompt is provided and no image
        result = await volcanoEngine.generateVideoFromText(
          prompt,
          { duration, resolution, watermark }
        );
      } else {
        throw new Error("Either prompt or imageUrl is required");
      }

      // Update history with task ID
      await db.update(generationHistory)
        .set({ 
          status: "processing",
          taskId: result.taskId,
          updatedAt: new Date(),
        })
        .where(eq(generationHistory.id, historyId));

      compensation.settle();

      return NextResponse.json({
        id: historyId,
        taskId: result.taskId,
        status: result.status,
        remainingCredits: deductResult.remainingCredits,
      });

    } catch (genError: unknown) {
      await compensation.compensate();
      // Update history to failed
      await db.update(generationHistory)
        .set({ 
          status: "failed", 
          error: getErrorMessage(genError, "Failed to generate video"),
          updatedAt: new Date(),
        })
        .where(eq(generationHistory.id, historyId));

      throw genError;
    }

  } catch (error: unknown) {
    console.error("Video generation API error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error, "Failed to generate video"),
    }, { status: 500 });
  }
}
