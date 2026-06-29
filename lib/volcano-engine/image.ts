import { volcanoEngineConfig, validateConfig, getHeaders } from './config';
import { 
  ImageGenerationRequest, 
  ImageGenerationResponse,
  VolcanoEngineError 
} from './types';

type ImageGenerationOptions = {
  size?: 'adaptive' | '1K' | '2K' | '4K';
  inputImages?: string[];
  watermark?: boolean;
};

export async function generateImage(
  prompt: string,
  options?: ImageGenerationOptions
): Promise<ImageGenerationResponse> {
  validateConfig();

  const model = volcanoEngineConfig.imageModel || 'doubao-seededit-3-0-i2i-250628';

  const size = options?.size || 'adaptive';
  const images = options?.inputImages?.filter(Boolean);

  const request: ImageGenerationRequest = {
    model,
    prompt,
    image: images && images.length > 0 ? images : undefined,
    response_format: 'url',
    size,
    watermark: options?.watermark !== undefined ? options.watermark : true,
  };

  const response = await fetch(`${volcanoEngineConfig.apiUrl}/images/generations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: VolcanoEngineError = await response.json();
    throw new Error(`Volcano Engine API error: ${error.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

export async function generateImageFromText(
  prompt: string
): Promise<{
  url: string;
  revisedPrompt?: string;
}> {
  const response = await generateImage(prompt);
  
  if (!response.data || response.data.length === 0) {
    throw new Error('No image generated');
  }

  return {
    url: response.data[0].url,
    revisedPrompt: response.data[0].revised_prompt,
  };
}
