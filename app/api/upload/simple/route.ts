import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/error-utils";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // In production, you would upload to a proper storage service
    // For now, we'll use a public image service or return the data URL
    
    // Option 1: Use a free image hosting service (like imgur)
    // Option 2: Return data URL (works for small images)
    // Option 3: Use an existing public image for testing
    
    // For testing, let's use a sample public image URL
    // You can replace this with actual upload logic later
    const testImageUrl = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seepro_i2v.png";
    
    console.log('Image uploaded (using test URL for now)');

    return NextResponse.json({ 
      url: testImageUrl, // Use test URL for now
      originalName: file.name,
      size: file.size,
      type: file.type,
      message: "Using test image URL for demo. In production, this would upload to real storage."
    });

  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: getErrorMessage(error, "Failed to upload file"),
    }, { status: 500 });
  }
}
