export * from './types';
export * from './config';
export * from './chat';
export * from './image';
export * from './video';

import { createChatCompletion, createChatStream } from './chat';
import { generateImage, generateImageFromText } from './image';
import { 
  generateVideo, 
  getVideoStatus, 
  generateVideoFromText, 
  generateVideoFromImage 
} from './video';

export const volcanoEngine = {
  // Chat functions
  createChatCompletion,
  createChatStream,
  
  // Image functions
  generateImage,
  generateImageFromText,
  
  // Video functions
  generateVideo,
  getVideoStatus,
  generateVideoFromText,
  generateVideoFromImage,
};