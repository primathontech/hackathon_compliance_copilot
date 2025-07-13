import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  RegulatoryKnowledgeService,
  RegulatoryQueryDto,
} from './regulatory-knowledge.service';
import { RegulationType, RuleCategory } from './regulatory-knowledge.entity';

@ApiTags('regulatory-knowledge')
@Controller('regulatory-knowledge')
export class RegulatoryKnowledgeController {
  constructor(
    private readonly regulatoryKnowledgeService: RegulatoryKnowledgeService,
  ) {}

  @Get('rules')
  @ApiOperation({ summary: 'Find applicable regulatory rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async findApplicableRules(
    @Query('regulation') regulation?: RegulationType,
    @Query('category') category?: RuleCategory,
    @Query('businessType') businessType?: string,
    @Query('jurisdiction') jurisdiction?: string,
    @Query('dataTypes') dataTypes?: string,
  ) {
    const query: RegulatoryQueryDto = {
      regulation,
      category,
      businessType,
      jurisdiction,
      dataTypes: dataTypes ? dataTypes.split(',') : undefined,
    };
    return await this.regulatoryKnowledgeService.findApplicableRules(query);
  }

  @Get('rules/category/:category')
  @ApiOperation({ summary: 'Get rules by category' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getRulesByCategory(@Param('category') category: RuleCategory) {
    return await this.regulatoryKnowledgeService.getRulesByCategory(category);
  }

  @Post('gap-analysis')
  @ApiOperation({ summary: 'Perform compliance gap analysis' })
  @ApiResponse({
    status: 200,
    description: 'Gap analysis completed successfully',
  })
  async performGapAnalysis(
    @Body()
    body: {
      merchantId: string;
      merchantData: {
        businessType: string;
        jurisdiction: string;
        dataTypes: string[];
        currentPolicies: string[];
        implementedControls: string[];
      };
    },
  ) {
    const { merchantId, merchantData } = body;
    return await this.regulatoryKnowledgeService.performGapAnalysis(
      merchantId,
      merchantData,
    );
  }

  @Post('seed-rules')
  @ApiOperation({ summary: 'Seed regulatory rules database' })
  @ApiResponse({ status: 200, description: 'Rules seeded successfully' })
  async seedRules() {
    return await this.regulatoryKnowledgeService.seedInitialRules();
  }

  @Get('regulations')
  @ApiOperation({ summary: 'Get all available regulations' })
  @ApiResponse({
    status: 200,
    description: 'Regulations retrieved successfully',
  })
  getAllRegulations() {
    return this.regulatoryKnowledgeService.getAllRegulations();
  }
}
