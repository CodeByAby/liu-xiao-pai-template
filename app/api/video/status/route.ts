export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generationHistory } from "@/lib/db/schema";
import { volcanoEngine } from "@/lib/volcano-engine";
import { normalizeStatus } from "@/lib/volcano-engine/video";
import type { VolcanoEngineTaskData } from "@/lib/volcano-engine/types";
import { uploadImageFromUrl } from "@/lib/r2-storage";
import { eq, and } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getFirstString(...values: Array<unknown>) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const userId = access.user.id;

    // Get task ID from query params
    const searchParams = req.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    const historyId = searchParams.get("historyId");

    if (!taskId || !historyId) {
      return NextResponse.json({ 
        error: "taskId and historyId are required" 
      }, { status: 400 });
    }

    // Verify the history entry belongs to the user
    const history = await db
      .select()
      .from(generationHistory)
      .where(and(
        eq(generationHistory.id, historyId),
        eq(generationHistory.userId, userId),
        eq(generationHistory.type, "video")
      ))
      .limit(1);

    if (!history || history.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const record = history[0];

    // If already completed or failed, return cached status
    if (record.status === "completed" || record.status === "failed") {
      return NextResponse.json({
        id: historyId,
        taskId: record.taskId,
        status: record.status,
        videoUrl: record.resultUrl,
        error: record.error,
      });
    }

    // Query video generation status from Volcano Engine
    try {
      const status = await volcanoEngine.getVideoStatus(taskId);

      // According to Volcano Engine docs, the response structure is:
      // { data: { task_status: "xxx", task_status_text: "xxx", result: { video_url: "xxx" } } }
      const taskData: VolcanoEngineTaskData = status.data ?? {
        task_id: taskId,
        task_status: typeof status.status === "string" ? status.status : "PENDING",
      };
      const rawTaskStatus = typeof taskData.task_status === 'string'
        ? taskData.task_status
        : typeof taskData.status === 'string'
          ? taskData.status
          : typeof status.status === 'string'
            ? status.status
            : '';
      const taskStatusText =
        typeof taskData.task_status_text === "string" ? taskData.task_status_text : "";
      const normalizedStatus = normalizeStatus(rawTaskStatus, taskStatusText);
      
      // Video URL 可能存在于不同字段或数组结构
      const videoUrl = taskData.result?.video_url ||
                      taskData.result?.url ||
                      taskData.result?.video?.[0]?.url ||
                      taskData.result?.videos?.[0]?.url ||
                      taskData.result?.output?.video_url ||
                      taskData.result?.contents?.find((item) => item?.type === 'video')?.url ||
                      status.content?.video_url ||
                      status.output?.video_url ||
                      status.output?.url ||
                      status.url;
      
      const isCompleted = normalizedStatus === 'completed';
      const isFailed = normalizedStatus === 'failed';
      
      if (isCompleted || videoUrl) {
        if (videoUrl) {
          try {
            // Try to upload to R2, but fallback to original URL if it fails
            const finalUrl = await uploadImageFromUrl(videoUrl, userId, 'video').catch(() => videoUrl);
            
            await db.update(generationHistory)
              .set({ 
                status: "completed",
                resultUrl: finalUrl,
                updatedAt: new Date(),
              })
              .where(eq(generationHistory.id, historyId));

            return NextResponse.json({
              id: historyId,
              taskId,
              status: "completed",
              videoUrl: finalUrl,
            });
          } catch (error) {
            console.error('Error processing video URL:', error);
            // Return the original URL if R2 upload fails
            return NextResponse.json({
              id: historyId,
              taskId,
              status: "completed",
              videoUrl: videoUrl,
            });
          }
        } else if (isCompleted) {
          // Status is completed but no URL yet
          return NextResponse.json({
            id: historyId,
            taskId,
            status: "processing",
            message: "Video is being finalized"
          });
        }
      } else if (isFailed) {
        const errorMessage =
          getFirstString(
            taskData.error,
            taskData.result?.error,
            status.output?.error,
            status.error,
            taskStatusText,
          ) ?? "Video generation failed";
        await db.update(generationHistory)
          .set({ 
            status: "failed",
            error: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(generationHistory.id, historyId));

        return NextResponse.json({
          id: historyId,
          taskId,
          status: "failed",
          error: errorMessage,
        });

      }
      
      // Status is 'running' or other processing states
      // Check if it's been running for too long (> 5 minutes)
      const createdAt = new Date(record.createdAt).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - createdAt) / (1000 * 60);
      
      if (elapsedMinutes > 5) {
        // Timeout after 5 minutes
        await db.update(generationHistory)
          .set({ 
            status: "failed",
            error: "Video generation timeout",
            updatedAt: new Date(),
          })
          .where(eq(generationHistory.id, historyId));
          
        return NextResponse.json({
          id: historyId,
          taskId,
          status: "failed",
          error: "Video generation timeout after 5 minutes",
        });
      }
      
      // Still processing - return status details
        return NextResponse.json({
          id: historyId,
          taskId,
          status: "processing",
          taskStatus: rawTaskStatus,
          statusText: taskStatusText,
          elapsedSeconds: Math.floor((now - createdAt) / 1000),
        });

    } catch (error: unknown) {
      console.error("Error checking video status:", error);
      return NextResponse.json({
        id: historyId,
        taskId,
        status: "processing",
        error: "Failed to check status",
      });
    }

  } catch (error: unknown) {
    console.error("Video status API error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error, "Failed to get video status"),
    }, { status: 500 });
  }
}
