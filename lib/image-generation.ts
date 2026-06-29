type CreateImageGenerationPayloadParams = {
  imageUrl?: string | null;
  prompt: string;
  size: "adaptive" | "1K" | "2K" | "4K";
  watermark: boolean;
};

export function createImageGenerationPayload({
  imageUrl,
  prompt,
  size,
  watermark,
}: CreateImageGenerationPayloadParams) {
  if (!imageUrl) {
    throw new Error("Reference image is required");
  }

  return {
    imageUrl,
    prompt,
    size,
    watermark,
  };
}
