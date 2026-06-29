export interface ClientSubscriptionSummary {
  planKey: string;
  status: string;
  currentPeriodEnd: string | Date | null;
}

export interface ClientUserProfile {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  credits: number;
  createdAt: string | Date;
  subscription: ClientSubscriptionSummary | null;
}

export interface UserProfileResponse {
  user: ClientUserProfile;
}

export interface CreditHistoryRecord {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string | Date;
  paymentId: string | null;
}

export interface CreditHistoryResponse {
  history: CreditHistoryRecord[];
  totalCount: number;
  hasMore: boolean;
}

export interface ApiErrorResponse {
  error?: string;
}

export type ChatStreamEvent =
  | {
      type: "metadata";
      sessionId: string;
      remainingCredits: number | null;
    }
  | {
      type: "content";
      content: string;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: string;
    };

export interface ImageGenerationResponsePayload {
  id: string;
  url: string;
  revisedPrompt?: string;
  remainingCredits: number | null;
  sourceImageUrl?: string;
}

export interface UploadImageResponse {
  url: string;
  filename?: string;
}

export interface VideoGenerationResponsePayload {
  id: string;
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  remainingCredits: number | null;
}

export interface VideoStatusResponsePayload {
  id: string;
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  message?: string;
}
