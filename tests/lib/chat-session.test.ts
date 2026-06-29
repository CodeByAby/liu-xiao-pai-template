import {
  __testUtils,
  getOrCreateOwnedChatSession,
} from "@/lib/chat-session";

type ChatSessionResolverDeps = NonNullable<
  Parameters<typeof getOrCreateOwnedChatSession>[1]
>;

type ChatSessionDatabase = NonNullable<ChatSessionResolverDeps["database"]>;

describe("getOrCreateOwnedChatSession", () => {
  it("rejects access to a chat session owned by another user", async () => {
    const insertValues = vi.fn();
    const database = {
      select: vi.fn(() => __testUtils.createSelectChain([])),
      insert: vi.fn(() => ({
        values: insertValues,
      })),
    } as ChatSessionDatabase;

    const result = await getOrCreateOwnedChatSession(
      {
        userId: "user-1",
        sessionId: "chat-123",
        title: "Hello",
        model: "doubao",
      },
      { database }
    );

    expect(result).toEqual({
      ok: false,
      error: "Chat session not found",
      status: 404,
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("allows access to an owned chat session", async () => {
    const database = {
      select: vi.fn(() =>
        __testUtils.createSelectChain([{ id: "chat-123" }])
      ),
      insert: vi.fn(() => ({
        values: vi.fn(),
      })),
    } as ChatSessionDatabase;

    const result = await getOrCreateOwnedChatSession(
      {
        userId: "user-1",
        sessionId: "chat-123",
        title: "Hello",
        model: "doubao",
      },
      { database }
    );

    expect(result).toEqual({
      ok: true,
      created: false,
      sessionId: "chat-123",
    });
  });

  it("creates a new chat session when no session id is provided", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const database = {
      select: vi.fn(() => __testUtils.createSelectChain([])),
      insert: vi.fn(() => ({
        values,
      })),
    } as ChatSessionDatabase;

    const result = await getOrCreateOwnedChatSession(
      {
        userId: "user-1",
        title: "Start here",
        model: "doubao",
      },
      {
        database,
        createId: () => "new-chat-id",
      }
    );

    expect(result).toEqual({
      ok: true,
      created: true,
      sessionId: "new-chat-id",
    });
    expect(values).toHaveBeenCalledWith({
      id: "new-chat-id",
      userId: "user-1",
      title: "Start here",
      model: "doubao",
    });
  });
});
