import { VolcanoEngineConfig } from './types';

export const volcanoEngineConfig: VolcanoEngineConfig = {
  apiKey: process.env.VOLCANO_ENGINE_API_KEY || '',
  apiUrl: process.env.VOLCANO_ENGINE_API_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  // 使用豆包模型名称，无需创建端点
  textModel: 'doubao-1-5-thinking-pro-250415',  // 豆包 1.5 Thinking Pro 版本（正确的模型名）
  imageModel: 'doubao-seededit-3-0-i2i-250628',  // 豆包 SeedEdit 3.0 图生图模型
  videoModel: 'doubao-seedance-1-0-pro-250528',  // Seedance Pro 视频生成模型
};

export function validateConfig(): void {
  if (!volcanoEngineConfig.apiKey) {
    throw new Error('VOLCANO_ENGINE_API_KEY is not configured');
  }
  if (!volcanoEngineConfig.apiUrl) {
    throw new Error('VOLCANO_ENGINE_API_URL is not configured');
  }
}

// 获取模型配置
export function getModelConfig() {
  return {
    text: volcanoEngineConfig.textModel,
    image: volcanoEngineConfig.imageModel,
    video: volcanoEngineConfig.videoModel,
  };
}

export function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${volcanoEngineConfig.apiKey}`,
  };
}
