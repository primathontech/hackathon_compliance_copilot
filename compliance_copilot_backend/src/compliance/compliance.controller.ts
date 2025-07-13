import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';

@ApiTags('compliance')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard data for current merchant' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Request() req: any) {
    // Use shop domain from headers or default merchant ID
    const merchantId = req.headers['x-shop-domain'] || 'default-merchant';
    return this.complianceService.getDashboardData(merchantId);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed compliance data for current merchant' })
  @ApiResponse({
    status: 200,
    description: 'Detailed compliance data retrieved successfully',
  })
  async getDetailedCompliance(@Request() req: any) {
    // Use shop domain from headers or default merchant ID
    const merchantId = req.headers['x-shop-domain'] || 'default-merchant';
    return this.complianceService.getDetailedComplianceData(merchantId);
  }

  @Post('audit')
  @ApiOperation({ summary: 'Run compliance audit for current merchant' })
  @ApiResponse({ status: 201, description: 'Audit started successfully' })
  async runAudit(@Request() req: any) {
    // Use shop domain from headers or default merchant ID
    const merchantId = req.headers['x-shop-domain'] || 'default-merchant';
    return this.complianceService.runComplianceAudit(merchantId);
  }

  @Get('audit/history')
  @ApiOperation({ summary: 'Get audit history for current merchant' })
  @ApiResponse({
    status: 200,
    description: 'Audit history retrieved successfully',
  })
  async getAuditHistory(@Request() req: any) {
    // Use shop domain from headers or default merchant ID
    const merchantId = req.headers['x-shop-domain'] || 'default-merchant';
    return this.complianceService.getAuditHistory(merchantId);
  }

  @Get('audit/:id')
  @ApiOperation({ summary: 'Get specific audit by ID' })
  @ApiResponse({ status: 200, description: 'Audit retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiParam({ name: 'id', description: 'Audit ID' })
  async getAudit(@Param('id') id: string) {
    return this.complianceService.getAuditById(id);
  }

  @Get('data-mapping')
  @ApiOperation({ summary: 'Get data mapping analysis for current merchant' })
  @ApiResponse({
    status: 200,
    description: 'Data mapping retrieved successfully',
  })
  async getDataMapping(@Request() req: any) {
    // Use shop domain from headers or default merchant ID
    const merchantId = req.headers['x-shop-domain'] || 'default-merchant';
    return this.complianceService.getDataMapping(merchantId);
  }
}
