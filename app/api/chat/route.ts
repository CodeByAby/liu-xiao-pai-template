import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatSession, chatMessage } from "@/lib/db/schema";
import { canUserChat, deductCredits } from "@/lib/credits";
import { eq } from "drizzle-orm";
import { volcanoEngine } from "@/lib/volcano-engine";
import { ChatMessage } from "@/lib/volcano-engine/types";
import { randomUUID } from "crypto";
import { getOrCreateOwnedChatSession } from "@/lib/chat-session";
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
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check if user has enough credits
    const hasCredits = await canUserChat(userId);
    if (!hasCredits) {
      return NextResponse.json({ 
        error: "Insufficient credits", 
        remainingCredits: 0 
      }, { status: 402 });
    }

    // Get or create chat session
    const sessionResult = await getOrCreateOwnedChatSession({
      userId,
      sessionId,
      title: message.substring(0, 100),
      model: "doubao-1-5-thinking-pro-250415",
    });

    if (!sessionResult.ok) {
      return NextResponse.json(
        { error: sessionResult.error },
        { status: sessionResult.status }
      );
    }
    const chatSessionId = sessionResult.sessionId;

    // Deduct credits
    const deductResult = await deductCredits(userId, 10, "chat_usage", chatSessionId);
    if (!deductResult.success) {
      return NextResponse.json({ 
        error: deductResult.error || "Failed to deduct credits",
        remainingCredits: deductResult.remainingCredits 
      }, { status: 402 });
    }

    const compensation = createCreditCompensation({
      userId,
      amount: 10,
      reason: "chat_usage_refund",
      referenceId: chatSessionId,
    });

    try {
      // Save user message
      const userMessageId = randomUUID();
      await db.insert(chatMessage).values({
        id: userMessageId,
        sessionId: chatSessionId,
        role: "user",
        content: message,
        creditsUsed: 10,
      });

      // Get chat history for context
      const messages = await db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.sessionId, chatSessionId))
        .orderBy(chatMessage.createdAt)
        .limit(20); // Keep last 20 messages for context

      // Build conversation history for Volcano Engine
      // Filter out the message we just inserted to avoid duplication
      const chatMessages: ChatMessage[] = messages
        .filter(m => m.id !== userMessageId)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Add the current message
      chatMessages.push({
        role: 'user',
        content: message,
      });

      // Call Volcano Engine API
      const response = await volcanoEngine.createChatCompletion(chatMessages, {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Save assistant message
      const assistantMessageId = randomUUID();
      await db.insert(chatMessage).values({
        id: assistantMessageId,
        sessionId: chatSessionId,
        role: "assistant",
        content: text,
        creditsUsed: 0,
      });

      // Update session
      await db
        .update(chatSession)
        .set({
          totalMessages: messages.length + 2,
          totalCreditsUsed: (messages.filter(m => m.role === "user").length + 1) * 10,
          lastMessageAt: new Date(),
        })
        .where(eq(chatSession.id, chatSessionId));

      compensation.settle();

      return NextResponse.json({
        sessionId: chatSessionId,
        message: text,
        remainingCredits: deductResult.remainingCredits,
      });
    } catch (error) {
      await compensation.compensate();
      throw error;
    }

  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error, "Failed to process chat"),
    }, { status: 500 });
  }
}
