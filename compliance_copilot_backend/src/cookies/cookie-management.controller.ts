import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CookieManagementService } from './cookie-management.service';
import { CookieCategory } from './cookie-management.entity';

@ApiTags('cookie-management')
@Controller('cookie-management')
export class CookieManagementController {
  constructor(
    private readonly cookieManagementService: CookieManagementService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan website for cookies' })
  @ApiResponse({
    status: 200,
    description: 'Cookie scan completed successfully',
  })
  async scanWebsiteCookies(
    @Body()
    body: {
      merchantId: string;
      websiteUrl: string;
      scanDepth?: number;
    },
  ) {
    const { merchantId, websiteUrl } = body;
    return await this.cookieManagementService.scanWebsiteCookies(
      merchantId,
      websiteUrl,
    );
  }

  @Get('cookies/:merchantId')
  @ApiOperation({ summary: 'Get cookies for a merchant' })
  @ApiResponse({
    status: 200,
    description: 'Cookies retrieved successfully',
  })
  async getCookiesByMerchant(@Param('merchantId') merchantId: string) {
    return await this.cookieManagementService.getCookiesByMerchant(merchantId);
  }

  @Post('update-category')
  @ApiOperation({ summary: 'Update cookie category' })
  @ApiResponse({
    status: 200,
    description: 'Cookie category updated successfully',
  })
  async updateCookieCategory(
    @Body()
    body: {
      cookieId: string;
      category: CookieCategory;
      purpose?: string;
    },
  ) {
    const { cookieId, category, purpose } = body;
    return await this.cookieManagementService.updateCookieCategory(
      cookieId,
      category,
      purpose,
    );
  }

  @Post('consent')
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: 200, description: 'Consent recorded successfully' })
  async recordConsent(
    @Body()
    body: {
      merchantId: string;
      consentData: {
        sessionId?: string;
        userId?: string;
        consentChoices: Record<string, boolean>;
        ipAddress?: string;
        userAgent?: string;
        consentMethod?: string;
      };
    },
  ) {
    const { merchantId, consentData } = body;
    return await this.cookieManagementService.recordConsent(
      merchantId,
      consentData,
    );
  }

  @Get('banner-config/:merchantId')
  @ApiOperation({ summary: 'Generate consent banner configuration' })
  @ApiResponse({
    status: 200,
    description: 'Banner configuration generated successfully',
  })
  async generateConsentBannerConfig(@Param('merchantId') merchantId: string) {
    return await this.cookieManagementService.generateConsentBannerConfig(
      merchantId,
    );
  }
}
