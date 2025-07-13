import { registerAs } from '@nestjs/config';

export interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  huggingFace: {
    apiKey: string;
    model: string;
  };
}

export default registerAs(
  'ai',
  (): AIConfig => ({
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    huggingFace: {
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      model: process.env.HUGGINGFACE_MODEL || 'microsoft/DialoGPT-medium',
    },
  }),
);
