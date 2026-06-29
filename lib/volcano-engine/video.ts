import { volcanoEngineConfig, validateConfig, getHeaders } from './config';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VolcanoEngineError,
  VolcanoEngineTaskData,
} from './types';

type NormalizedTask = {
  taskId: string;
  rawStatus: string;
  normalizedStatus: string;
  data: VolcanoEngineTaskData;
};

export function normalizeStatus(status?: string, fallbackText?: string): string {
  const raw = status || fallbackText || '';
  const value = raw.toLowerCase();

  if (!value) {
    return 'pending';
  }

  if (
    value === 'succeeded' ||
    value === 'success' ||
    value === 'completed' ||
    value === 'done' ||
    value === 'finish' ||
    value.includes('succeed') ||
    value.includes('success') ||
    value.includes('complete') ||
    value.includes('finish')
  ) {
    return 'completed';
  }

  if (
    value === 'failed' ||
    value === 'error' ||
    value === 'timeout' ||
    value.includes('fail') ||
    value.includes('error') ||
    value.includes('timeout')
  ) {
    return 'failed';
  }

  if (
    value === 'pending' ||
    value === 'created' ||
    value === 'waiting' ||
    value.includes('queue')
  ) {
    return 'pending';
  }

  return 'processing';
}

function ensureTask(response: VideoGenerationResponse, fallbackTaskId?: string): NormalizedTask {
  const derivedTaskId =
    response.data?.task_id ||
    (typeof response.id === 'string' ? response.id : undefined) ||
    fallbackTaskId;

  if (!derivedTaskId) {
    console.error('Unable to determine task ID from response:', response);
    throw new Error('Failed to get task ID from video generation response');
  }

  const rawStatus =
    (typeof response.data?.task_status === 'string' && response.data.task_status) ||
    (typeof response.status === 'string' && response.status) ||
    'PENDING';

  const taskData: VolcanoEngineTaskData = {
    ...(response.data || {}),
    task_id: derivedTaskId,
    task_status: rawStatus,
  };

  return {
    taskId: derivedTaskId,
    rawStatus,
    normalizedStatus: normalizeStatus(rawStatus, response.data?.task_status_text),
    data: taskData,
  };
}

export async function generateVideo(
  input: {
    prompt?: string;
    imageUrl?: string;
  },
  options?: {
    resolution?: '480p' | '720p' | '1080p';
    duration?: number;
    watermark?: boolean;
    cameraFixed?: boolean;
  }
): Promise<VideoGenerationResponse> {
  validateConfig();

  const model = volcanoEngineConfig.videoModel || 'doubao-seedance-1-0-pro-250528';

  if (!input.prompt && !input.imageUrl) {
    throw new Error('Either prompt or imageUrl is required for video generation');
  }

  // Build content array based on input
  const content: VideoGenerationRequest['content'] = [];
  
  // Build text with parameters first
  const textParts: string[] = [];
  if (input.prompt) {
    textParts.push(input.prompt);
  }
  
  // Add generation parameters
  if (options?.resolution) textParts.push(`--resolution ${options.resolution}`);
  if (options?.duration) textParts.push(`--duration ${options.duration}`);
  if (options?.cameraFixed !== undefined) textParts.push(`--camerafixed ${options.cameraFixed}`);
  if (options?.watermark !== undefined) textParts.push(`--watermark ${options.watermark}`);
  
  // Add text content first (matches curl example order)
  if (textParts.length > 0) {
    content.push({
      type: 'text',
      text: textParts.join(' ').trim()
    });
  } else if (!input.imageUrl) {
    // If no prompt and no image, add default text
    content.push({
      type: 'text',
      text: 'Generate video'
    });
  }
  
  // Add image URL second if provided (for image-to-video)
  if (input.imageUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: input.imageUrl
      }
    });
  }

  const request: VideoGenerationRequest = {
    model,
    content
  };

  console.log('Video generation request:', JSON.stringify(request, null, 2));

  // Video generation uses a different endpoint - creates a task
  const response = await fetch(`${volcanoEngineConfig.apiUrl}/contents/generations/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
    cache: 'no-store',
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const error: VolcanoEngineError = await response.json();
    console.error('Video generation error:', error);
    throw new Error(`Volcano Engine API error: ${error.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  console.log('Video generation response:', JSON.stringify(result, null, 2));

  const taskInfo = ensureTask(result);

  return {
    ...result,
    id: taskInfo.taskId,
    status: taskInfo.rawStatus,
    data: taskInfo.data,
  };
}

export async function getVideoStatus(taskId: string): Promise<VideoGenerationResponse> {
  validateConfig();

  console.log('Checking video status for task:', taskId);

  // Video status is checked via the task endpoint
  const response = await fetch(
    `${volcanoEngineConfig.apiUrl}/contents/generations/tasks/${taskId}`,
    {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    const error: VolcanoEngineError = await response.json();
    console.error('Video status error:', error);
    throw new Error(`Volcano Engine API error: ${error.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  console.log('Video status response:', JSON.stringify(result, null, 2));

  const taskInfo = ensureTask(result, taskId);

  return {
    ...result,
    id: taskInfo.taskId,
    status: taskInfo.rawStatus,
    data: taskInfo.data,
  };
}

export async function generateVideoFromText(
  prompt: string,
  options?: {
    duration?: number;
    resolution?: '480p' | '720p' | '1080p';
    watermark?: boolean;
    cameraFixed?: boolean;
  }
): Promise<{
  taskId: string;
  status: string;
}> {
  const response = await generateVideo(
    { prompt },
    options
  );

  const taskInfo = ensureTask(response);

  return {
    taskId: taskInfo.taskId,
    status: taskInfo.normalizedStatus,
  };
}

export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  options?: {
    duration?: number;
    resolution?: '480p' | '720p' | '1080p';
    watermark?: boolean;
    cameraFixed?: boolean;
  }
): Promise<{
  taskId: string;
  status: string;
}> {
  const response = await generateVideo(
    { imageUrl, prompt },
    options
  );

  const taskInfo = ensureTask(response);

  return {
    taskId: taskInfo.taskId,
    status: taskInfo.normalizedStatus,
  };
}
