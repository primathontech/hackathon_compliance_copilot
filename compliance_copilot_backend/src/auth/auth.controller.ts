import {
  Controller,
  Get,
  Post,
  Query,
  Redirect,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { ShopifyService } from './shopify.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

export class InstallQueryDto {
  @IsString()
  shop: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class RefreshTokenDto {
  refresh_token: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private shopifyService: ShopifyService,
  ) {}

  @Get('shopify/install')
  @ApiOperation({ summary: 'Initiate Shopify app installation' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Shopify authorization',
  })
  @Redirect()
  async initiateInstall(@Query() query: InstallQueryDto) {
    const { shop } = query;

    if (!shop) {
      throw new Error('Shop parameter is required');
    }

    const authUrl = this.shopifyService.generateAuthUrl(shop);

    return {
      url: authUrl,
      statusCode: 302,
    };
  }

  @Get('shopify/callback')
  @ApiOperation({ summary: 'Handle Shopify OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async handleCallback(@Query() query: InstallQueryDto) {
    const { shop, code, state } = query;

    if (!shop || !code) {
      throw new Error('Shop and code parameters are required');
    }

    const result = await this.authService.validateShopifyInstall(
      shop,
      code,
      state,
    );

    // In a real app, you might redirect to the frontend with the token
    // For now, return the token directly
    return {
      success: true,
      access_token: result.access_token,
      merchant: {
        id: result.merchant.id,
        shopDomain: result.merchant.shopDomain,
        shopName: result.merchant.shopName,
        complianceStatus: result.merchant.complianceStatus,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Request() req: any) {
    const merchantId = req.user.id;
    const newToken = await this.authService.refreshToken(merchantId);

    return {
      access_token: newToken,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current merchant profile' })
  @ApiResponse({ status: 200, description: 'Merchant profile retrieved' })
  async getProfile(@Request() req: any) {
    const merchant = req.user;

    return {
      id: merchant.id,
      shopDomain: merchant.shopDomain,
      shopName: merchant.shopName,
      subscriptionPlan: merchant.subscriptionPlan,
      complianceStatus: merchant.complianceStatus,
      complianceScore: merchant.complianceScore,
      lastAuditDate: merchant.lastAuditDate,
      createdAt: merchant.createdAt,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    // In a stateless JWT system, logout is handled client-side
    // You might want to implement token blacklisting here
    return {
      message: 'Logged out successfully',
    };
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  async verifyToken(@Request() req: any) {
    return {
      valid: true,
      merchant: {
        id: req.user.id,
        shopDomain: req.user.shopDomain,
      },
    };
  }
}
