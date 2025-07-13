import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentMerchant } from '../auth/decorators/current-merchant.decorator';
import { Merchant } from '../entities/merchant.entity';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current merchant profile' })
  getProfile(@CurrentMerchant() merchant: Merchant): Merchant {
    return merchant;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get merchant statistics' })
  async getStats(): Promise<{
    totalMerchants: number;
    activeMerchants: number;
    averageComplianceScore: number;
  }> {
    const totalMerchants = await this.merchantsService.findAll();
    const activeCount = await this.merchantsService.getActiveCount();
    const averageScore =
      await this.merchantsService.getAverageComplianceScore();

    return {
      totalMerchants: totalMerchants.length,
      activeMerchants: activeCount,
      averageComplianceScore: averageScore,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update merchant profile' })
  async updateProfile(
    @CurrentMerchant() merchant: Merchant,
    @Body() updateData: Partial<Merchant>,
  ): Promise<Merchant> {
    return this.merchantsService.update(merchant.id, updateData);
  }
}
