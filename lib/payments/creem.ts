// Minimal Creem client wrapper. Replace endpoints/fields with the official API when IDs are provided.
import crypto from "node:crypto";

type CreateCheckoutParams = {
  userId: string;
  key: string; // plan or pack key
  kind: "subscription" | "one_time";
  successUrl: string;
  cancelUrl: string;
  // Provider identifiers to be filled later
  creemPriceId?: string;
};

export type CreateCheckoutResult = {
  url: string;
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
  const apiKey = getEnv("CREEM_API_KEY");
  const simulate = process.env.CREEM_SIMULATE === "true";

  if (simulate) {
    // In simulate mode, go through a placeholder endpoint that redirects back with success=1
    return { url: "/api/payments/creem/redirect-placeholder?success=1" };
  }

  // Create payload according to Creem API documentation
  const payload: Record<string, unknown> = {
    product_id: params.creemPriceId, // Creem expects product_id
    success_url: params.successUrl,
    metadata: {
      userId: params.userId,
      key: params.key,
      kind: params.kind,
    },
  };

  const base = process.env.CREEM_API_BASE || "https://api.creem.io";
  const endpointUrl = `${base}/v1/checkouts`; // Correct endpoint path from docs

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey, // Creem uses x-api-key header, not Authorization Bearer
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Creem checkout create failed: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { url?: string; checkout_url?: string; id?: string };
    const redirectUrl = data.checkout_url || data.url; // Creem returns checkout_url
    
    if (!redirectUrl) {
      throw new Error("Creem checkout response missing checkout_url");
    }
    
    return { url: redirectUrl };
  } catch (error) {
    console.error("Error creating Creem checkout session:", error);
    throw error;
  }
}

export function verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
  // Support official header name; also allow x-creem-signature if provider uses x- prefix
  const signature = headers.get("creem-signature") || headers.get("x-creem-signature");
  if (!signature) {
    console.error("Missing creem-signature header");
    return false;
  }

  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CREEM_WEBHOOK_SECRET not configured");
    return false;
  }

  // Generate signature using HMAC-SHA256
  const computedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Compare signatures (timing-safe comparison)
  const sigBuf = Buffer.from(signature);
  const compBuf = Buffer.from(computedSignature);
  if (sigBuf.length !== compBuf.length) {
    return false;
  }
  const isValid = crypto.timingSafeEqual(sigBuf, compBuf);
  
  if (!isValid) {
    // Log less verbose error (signatures might contain sensitive info)
    console.error("Webhook signature verification failed");
  }

  return isValid;
}
