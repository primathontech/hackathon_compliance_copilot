import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Merchant } from '../entities/merchant.entity';
import { ShopifyService } from './shopify.service';

export interface JwtPayload {
  sub: string;
  shopifyShopId: string;
  shopDomain: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  access_token: string;
  merchant: Merchant;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private shopifyService: ShopifyService,
  ) {}

  async validateShopifyInstall(
    shop: string,
    code: string,
    state?: string,
  ): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const accessToken = await this.shopifyService.exchangeCodeForToken(
        shop,
        code,
      );

      // Get shop information
      const shopInfo = await this.shopifyService.getShopInfo(shop, accessToken);

      // Create or update merchant
      let merchant = await this.merchantRepository.findOne({
        where: { shopifyShopId: shopInfo.id.toString() },
      });

      if (!merchant) {
        merchant = this.merchantRepository.create({
          shopifyShopId: shopInfo.id.toString(),
          shopDomain: shopInfo.domain,
          shopName: shopInfo.name,
          accessToken,
          subscriptionPlan: 'free',
          complianceStatus: 'pending',
        });
      } else {
        merchant.accessToken = accessToken;
        merchant.shopName = shopInfo.name;
        merchant.shopDomain = shopInfo.domain;
      }

      merchant = await this.merchantRepository.save(merchant);

      // Generate JWT token
      const payload: JwtPayload = {
        sub: merchant.id,
        shopifyShopId: merchant.shopifyShopId,
        shopDomain: merchant.shopDomain,
      };

      const access_token = this.jwtService.sign(payload);

      return { access_token, merchant };
    } catch (error) {
      throw new UnauthorizedException('Invalid Shopify installation');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: payload.sub },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid token');
    }

    return merchant;
  }

  async refreshToken(merchantId: string): Promise<string> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new UnauthorizedException('Merchant not found');
    }

    const payload: JwtPayload = {
      sub: merchant.id,
      shopifyShopId: merchant.shopifyShopId,
      shopDomain: merchant.shopDomain,
    };

    return this.jwtService.sign(payload);
  }

  async getMerchantByShopDomain(shopDomain: string): Promise<Merchant | null> {
    return this.merchantRepository.findOne({
      where: { shopDomain },
    });
  }

  async updateMerchantWebhookStatus(
    merchantId: string,
    verified: boolean,
  ): Promise<void> {
    await this.merchantRepository.update(merchantId, {
      webhookVerified: verified,
    });
  }
}
