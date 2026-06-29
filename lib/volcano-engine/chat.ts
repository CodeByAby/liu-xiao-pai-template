import { volcanoEngineConfig, validateConfig, getHeaders } from './config';
import { 
  ChatRequest, 
  ChatResponse, 
  ChatMessage,
  VolcanoEngineError,
  ChatStreamDoneChunk,
  ChatStreamResponseChunk,
} from './types';

export async function createChatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<ChatResponse> {
  validateConfig();

  const model = volcanoEngineConfig.textModel || 'doubao-1-5-thinking-pro-250415';

  const request: ChatRequest = {
    model,
    messages,
    stream: false,
    temperature: options?.temperature ?? 0.7,
    top_p: options?.top_p ?? 0.95,
    max_tokens: options?.max_tokens ?? 2048,
  };

  const response = await fetch(`${volcanoEngineConfig.apiUrl}/chat/completions`, {
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

export async function createChatStream(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<ReadableStream> {
  validateConfig();

  const model = volcanoEngineConfig.textModel || 'doubao-1-5-thinking-pro-250415';

  const request: ChatRequest = {
    model,
    messages,
    stream: true,
    temperature: options?.temperature ?? 0.7,
    top_p: options?.top_p ?? 0.95,
    max_tokens: options?.max_tokens ?? 2048,
  };

  const response = await fetch(`${volcanoEngineConfig.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: VolcanoEngineError = await response.json();
    throw new Error(`Volcano Engine API error: ${error.error?.message || 'Unknown error'}`);
  }

  if (!response.body) {
    throw new Error('No response stream available');
  }

  return response.body;
}

export function parseSSEChunk(chunk: string): ChatStreamResponseChunk | ChatStreamDoneChunk | null {
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      if (data === '[DONE]') {
        return { done: true };
      }
      
      try {
        return JSON.parse(data) as ChatStreamResponseChunk;
      } catch {
        // Ignore parse errors
      }
    }
  }
  
  return null;
}
