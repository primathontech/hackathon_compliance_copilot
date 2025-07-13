import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ShopifyService } from '../shopify.service';

@Injectable()
export class ShopifyAuthGuard implements CanActivate {
  constructor(private shopifyService: ShopifyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { shop, signature, timestamp } = request.query;

    if (!shop || !signature || !timestamp) {
      throw new UnauthorizedException('Missing required Shopify parameters');
    }

    // Verify Shopify request signature
    const isValid = await this.verifyShopifySignature(request);

    if (!isValid) {
      throw new UnauthorizedException('Invalid Shopify signature');
    }

    return true;
  }

  private async verifyShopifySignature(request: Request): Promise<boolean> {
    try {
      // This is a simplified verification - in production you'd want more robust verification
      const { shop, signature, timestamp } = request.query;

      // Check if timestamp is recent (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp as string, 10);

      if (now - requestTime > 300) {
        // 5 minutes
        return false;
      }

      // In a real implementation, you'd verify the HMAC signature here
      // For now, we'll just check if required parameters are present
      return !!(shop && signature && timestamp);
    } catch (error) {
      return false;
    }
  }
}
