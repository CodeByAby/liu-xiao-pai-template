import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSession } from "@/lib/db/schema";

type ChatSessionRecord = {
  id: string;
};

type ChatSessionDatabase = Pick<typeof db, "insert" | "select">;

type GetOrCreateOwnedChatSessionParams = {
  userId: string;
  sessionId?: string | null;
  title: string;
  model: string;
};

type ChatSessionResolverDeps = {
  createId?: () => string;
  database?: ChatSessionDatabase;
};

export type OwnedChatSessionResult =
  | {
      ok: true;
      created: boolean;
      sessionId: string;
    }
  | {
      ok: false;
      error: string;
      status: 404;
    };

function createSelectChain(result: ChatSessionRecord[]) {
  return {
    from() {
      return {
        where() {
          return {
            limit() {
              return Promise.resolve(result);
            },
          };
        },
      };
    },
  };
}

export async function getOrCreateOwnedChatSession(
  { userId, sessionId, title, model }: GetOrCreateOwnedChatSessionParams,
  deps: ChatSessionResolverDeps = {}
): Promise<OwnedChatSessionResult> {
  const database = deps.database ?? db;
  const createId = deps.createId ?? randomUUID;

  if (sessionId) {
    const sessions = await database
      .select({ id: chatSession.id })
      .from(chatSession)
      .where(
        and(eq(chatSession.id, sessionId), eq(chatSession.userId, userId))
      )
      .limit(1);

    if (sessions.length === 0) {
      return {
        ok: false,
        error: "Chat session not found",
        status: 404,
      };
    }

    return {
      ok: true,
      created: false,
      sessionId,
    };
  }

  const nextSessionId = createId();

  await database.insert(chatSession).values({
    id: nextSessionId,
    userId,
    title,
    model,
  });

  return {
    ok: true,
    created: true,
    sessionId: nextSessionId,
  };
}

export const __testUtils = {
  createSelectChain,
};
