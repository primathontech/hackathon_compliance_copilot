import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

export interface ShopInfo {
  id: number;
  name: string;
  domain: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
  plan_name: string;
}

@Injectable()
export class ShopifyService {
  private shopify: any;

  constructor(private configService: ConfigService) {
    this.shopify = shopifyApi({
      apiKey: this.configService.get<string>('SHOPIFY_API_KEY'),
      apiSecretKey: this.configService.get<string>('SHOPIFY_API_SECRET') || '',
      scopes:
        this.configService.get<string>('SHOPIFY_SCOPES')?.split(',') || [],
      hostName:
        this.configService.get<string>('SHOPIFY_APP_URL') || 'localhost',
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: true,
    });
  }

  generateAuthUrl(shop: string, state?: string): string {
    try {
      return this.shopify.auth.buildAuthorizationUrl({
        shop,
        state,
        isOnline: false,
      });
    } catch (error) {
      throw new BadRequestException('Invalid shop domain');
    }
  }

  async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    try {
      const response = await this.shopify.auth.callback({
        rawRequest: {
          url: `https://${shop}/admin/oauth/access_token`,
          method: 'POST',
          headers: {},
        },
        rawResponse: {},
      });

      // Alternative approach using direct API call
      const tokenResponse = await fetch(
        `https://${shop}/admin/oauth/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: this.configService.get<string>('SHOPIFY_API_KEY'),
            client_secret: this.configService.get<string>('SHOPIFY_API_SECRET'),
            code,
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    } catch (error) {
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  async getShopInfo(shop: string, accessToken: string): Promise<ShopInfo> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch shop information');
      }

      const data = await response.json();
      return data.shop;
    } catch (error) {
      throw new BadRequestException('Failed to fetch shop information');
    }
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<boolean> {
    try {
      return this.shopify.webhooks.verify({
        rawBody,
        signature,
      });
    } catch (error) {
      return false;
    }
  }

  async createWebhook(
    shop: string,
    accessToken: string,
    topic: string,
    address: string,
  ): Promise<any> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/2024-01/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address,
              format: 'json',
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create webhook');
      }

      const data = await response.json();
      return data.webhook;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create webhook: ${error.message}`,
      );
    }
  }

  async getCustomers(
    shop: string,
    accessToken: string,
    limit = 50,
    sinceId?: string,
  ): Promise<any[]> {
    try {
      let url = `https://${shop}/admin/api/2024-01/customers.json?limit=${limit}`;
      if (sinceId) {
        url += `&since_id=${sinceId}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      return data.customers;
    } catch (error) {
      throw new BadRequestException('Failed to fetch customers');
    }
  }

  async getOrders(
    shop: string,
    accessToken: string,
    limit = 50,
    sinceId?: string,
  ): Promise<any[]> {
    try {
      let url = `https://${shop}/admin/api/2024-01/orders.json?limit=${limit}&status=any`;
      if (sinceId) {
        url += `&since_id=${sinceId}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      return data.orders;
    } catch (error) {
      throw new BadRequestException('Failed to fetch orders');
    }
  }
}
