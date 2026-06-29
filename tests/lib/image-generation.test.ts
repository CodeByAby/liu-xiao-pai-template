import { createImageGenerationPayload } from "@/lib/image-generation";

describe("createImageGenerationPayload", () => {
  it("throws when the reference image is missing", () => {
    expect(() =>
      createImageGenerationPayload({
        prompt: "Turn this into a watercolor portrait",
        size: "2K",
        watermark: true,
      })
    ).toThrow("Reference image is required");
  });

  it("returns a complete payload when the reference image is present", () => {
    expect(
      createImageGenerationPayload({
        prompt: "Turn this into a watercolor portrait",
        size: "2K",
        watermark: false,
        imageUrl: "https://cdn.example.com/reference.png",
      })
    ).toEqual({
      prompt: "Turn this into a watercolor portrait",
      size: "2K",
      watermark: false,
      imageUrl: "https://cdn.example.com/reference.png",
    });
  });

  it("supports adaptive sizing because the image demo uses it by default", () => {
    expect(
      createImageGenerationPayload({
        prompt: "Turn this into a watercolor portrait",
        size: "adaptive",
        watermark: true,
        imageUrl: "https://cdn.example.com/reference.png",
      })
    ).toEqual({
      prompt: "Turn this into a watercolor portrait",
      size: "adaptive",
      watermark: true,
      imageUrl: "https://cdn.example.com/reference.png",
    });
  });
});
