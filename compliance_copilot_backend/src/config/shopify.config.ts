import { registerAs } from '@nestjs/config';

export interface ShopifyConfig {
  apiKey: string;
  apiSecret: string;
  scopes: string[];
  appUrl: string;
  apiVersion: string;
  webhookPath: string;
}

export default registerAs(
  'shopify',
  (): ShopifyConfig => ({
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SHOPIFY_SCOPES?.split(',') || [
      'read_customers',
      'write_customers',
      'read_orders',
      'write_orders',
      'read_products',
      'write_products',
      'read_content',
      'write_content',
    ],
    appUrl: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
    webhookPath: '/api/webhooks/shopify',
  }),
);
