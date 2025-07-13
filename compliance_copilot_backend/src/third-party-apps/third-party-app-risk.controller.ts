import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThirdPartyAppRiskService } from './third-party-app-risk.service';

@ApiTags('third-party-app-risk')
@Controller('third-party-app-risk')
export class ThirdPartyAppRiskController {
  constructor(
    private readonly thirdPartyAppRiskService: ThirdPartyAppRiskService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan Shopify apps for risk assessment' })
  @ApiResponse({
    status: 200,
    description: 'App scan completed successfully',
  })
  async scanShopifyApps(
    @Body()
    body: {
      merchantId: string;
    },
  ) {
    const { merchantId } = body;
    return await this.thirdPartyAppRiskService.scanShopifyApps(merchantId);
  }

  @Get('apps/:merchantId')
  @ApiOperation({ summary: 'Get third-party apps for a merchant' })
  @ApiResponse({
    status: 200,
    description: 'Apps retrieved successfully',
  })
  async getAppsByMerchant(@Param('merchantId') merchantId: string) {
    return await this.thirdPartyAppRiskService.getAppsByMerchant(merchantId);
  }

  @Post('risk-assessment')
  @ApiOperation({ summary: 'Perform risk assessment' })
  @ApiResponse({
    status: 200,
    description: 'Risk assessment completed successfully',
  })
  async performRiskAssessment(
    @Body()
    body: {
      merchantId: string;
    },
  ) {
    const { merchantId } = body;
    return await this.thirdPartyAppRiskService.performRiskAssessment(
      merchantId,
    );
  }

  @Get('latest-assessment/:merchantId')
  @ApiOperation({ summary: 'Get latest risk assessment for merchant' })
  @ApiResponse({
    status: 200,
    description: 'Latest assessment retrieved successfully',
  })
  async getLatestRiskAssessment(@Param('merchantId') merchantId: string) {
    return await this.thirdPartyAppRiskService.getLatestRiskAssessment(
      merchantId,
    );
  }
}
