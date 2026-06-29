import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// R2 Configuration
const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || '';
const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || '';
const STORAGE_PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || '';
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || '';
const STORAGE_BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'starter';

// Extract endpoint URL from the full endpoint if needed
const getEndpointUrl = () => {
  if (STORAGE_ENDPOINT.includes('.r2.cloudflarestorage.com')) {
    // Extract just the endpoint URL without bucket
    const parts = STORAGE_ENDPOINT.split('/');
    return parts[0] + '//' + parts[2]; // https://xxx.r2.cloudflarestorage.com
  }
  return STORAGE_ENDPOINT;
};

// Create S3 client configured for R2
// Using R2's S3-compatible API with the correct endpoint
const r2Client = STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY ? new S3Client({
  region: "auto",
  endpoint: getEndpointUrl(),
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  },
}) : null;

/**
 * Upload file to R2 storage
 */
async function uploadToR2(
  key: string, 
  body: Buffer | Uint8Array,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 storage not configured');
  }

  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    // R2 doesn't support ACL, objects are public via the custom domain
  });

  await r2Client.send(command);

  // Return public URL
  return `${STORAGE_PUBLIC_URL}/${key}`;
}

/**
 * Delete file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client) {
    throw new Error('R2 storage not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: STORAGE_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Upload image from URL to R2
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  userId: string,
  type: 'image' | 'video' = 'image'
): Promise<string> {
  try {
    // If R2 is not configured, return original URL
    if (!isR2Configured()) {
      console.log('R2 not configured, using original URL');
      return imageUrl;
    }

    // Download资源时禁用 Next.js 数据缓存，避免超 2MB 限制
    const response = await fetch(imageUrl, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Generate unique key with user folder structure
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = getExtensionFromContentType(contentType);
    const key = `${type}s/${userId}/${timestamp}_${random}.${extension}`;

    // Upload to R2
    const publicUrl = await uploadToR2(key, buffer, contentType);
    
    console.log(`Uploaded ${type} to R2:`, publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2, using original URL:', error);
    // Fall back to original URL if upload fails
    return imageUrl;
  }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  
  return typeMap[contentType] || contentType.split('/')[1] || 'bin';
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY && STORAGE_PUBLIC_URL);
}
