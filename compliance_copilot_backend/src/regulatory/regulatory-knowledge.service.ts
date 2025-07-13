import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RegulatoryRule,
  RegulationType,
  RuleCategory,
  ComplianceRequirement,
} from './regulatory-knowledge.entity';

export interface RegulatoryQueryDto {
  regulation?: RegulationType;
  category?: RuleCategory;
  businessType?: string;
  jurisdiction?: string;
  dataTypes?: string[];
}

export interface ComplianceGap {
  rule: RegulatoryRule;
  currentStatus: 'compliant' | 'partial' | 'non_compliant';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: string;
  deadline?: Date;
}

export interface ComplianceGapAnalysis {
  merchantId: string;
  applicableRules: RegulatoryRule[];
  gaps: ComplianceGap[];
  overallComplianceScore: number;
  priorityActions: string[];
}

export interface MerchantData {
  businessType: string;
  jurisdiction: string;
  dataTypes: string[];
  currentPolicies: string[];
  implementedControls: string[];
}

@Injectable()
export class RegulatoryKnowledgeService {
  private readonly logger = new Logger(RegulatoryKnowledgeService.name);

  constructor(
    @InjectRepository(RegulatoryRule)
    private regulatoryRuleRepository: Repository<RegulatoryRule>,
  ) {}

  async findApplicableRules(
    query: RegulatoryQueryDto,
  ): Promise<RegulatoryRule[]> {
    const queryBuilder = this.regulatoryRuleRepository
      .createQueryBuilder('rule')
      .where('rule.isActive = :isActive', { isActive: true });

    if (query.regulation) {
      queryBuilder.andWhere('rule.regulation = :regulation', {
        regulation: query.regulation,
      });
    }

    if (query.category) {
      queryBuilder.andWhere('rule.category = :category', {
        category: query.category,
      });
    }

    if (query.businessType) {
      queryBuilder.andWhere(
        "rule.applicabilityConditions->>'businessTypes' IS NULL OR :businessType = ANY(CAST(rule.applicabilityConditions->>'businessTypes' AS text[]))",
        { businessType: query.businessType },
      );
    }

    if (query.jurisdiction) {
      queryBuilder.andWhere(
        "rule.applicabilityConditions->>'jurisdictions' IS NULL OR :jurisdiction = ANY(CAST(rule.applicabilityConditions->>'jurisdictions' AS text[]))",
        { jurisdiction: query.jurisdiction },
      );
    }

    if (query.dataTypes && query.dataTypes.length > 0) {
      queryBuilder.andWhere(
        "rule.applicabilityConditions->>'dataTypes' IS NULL OR rule.applicabilityConditions->>'dataTypes' && :dataTypes",
        { dataTypes: query.dataTypes },
      );
    }

    return queryBuilder
      .orderBy('rule.requirement', 'ASC')
      .addOrderBy('rule.category', 'ASC')
      .getMany();
  }

  async getRulesByCategory(
    category: RuleCategory,
    regulation?: RegulationType,
  ): Promise<RegulatoryRule[]> {
    const queryBuilder = this.regulatoryRuleRepository
      .createQueryBuilder('rule')
      .where('rule.category = :category', { category })
      .andWhere('rule.isActive = :isActive', { isActive: true });

    if (regulation) {
      queryBuilder.andWhere('rule.regulation = :regulation', { regulation });
    }

    return queryBuilder
      .orderBy('rule.requirement', 'ASC')
      .addOrderBy('rule.title', 'ASC')
      .getMany();
  }

  async performGapAnalysis(
    merchantId: string,
    merchantData: MerchantData,
  ): Promise<ComplianceGapAnalysis> {
    // Find applicable rules based on merchant data
    const applicableRules = await this.findApplicableRules({
      businessType: merchantData.businessType,
      jurisdiction: merchantData.jurisdiction,
      dataTypes: merchantData.dataTypes,
    });

    const gaps: ComplianceGap[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const rule of applicableRules) {
      const analysis = this.analyzeRuleCompliance(rule, merchantData);
      gaps.push(analysis);

      // Calculate scores
      maxScore += this.getRuleWeight(rule.requirement);
      if (analysis.currentStatus === 'compliant') {
        totalScore += this.getRuleWeight(rule.requirement);
      } else if (analysis.currentStatus === 'partial') {
        totalScore += this.getRuleWeight(rule.requirement) * 0.5;
      }
    }

    const overallComplianceScore =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    // Generate priority actions
    const priorityActions = gaps
      .filter(
        (gap) => gap.riskLevel === 'critical' || gap.riskLevel === 'high',
      )
      .sort(
        (a, b) =>
          this.getRiskScore(b.riskLevel) - this.getRiskScore(a.riskLevel),
      )
      .slice(0, 5)
      .map((gap) => gap.actionRequired);

    return {
      merchantId,
      applicableRules,
      gaps,
      overallComplianceScore,
      priorityActions,
    };
  }

  private analyzeRuleCompliance(
    rule: RegulatoryRule,
    merchantData: MerchantData,
  ): ComplianceGap {
    // Simplified compliance analysis - in real implementation, this would be more sophisticated
    let currentStatus: 'compliant' | 'partial' | 'non_compliant' =
      'non_compliant';
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let actionRequired = `Implement ${rule.title}`;

    // Basic analysis based on rule category
    switch (rule.category) {
      case RuleCategory.PRIVACY_POLICY:
        if (merchantData.currentPolicies.includes('privacy_policy')) {
          currentStatus = 'compliant';
          riskLevel = 'low';
          actionRequired = 'Review and update privacy policy regularly';
        } else {
          riskLevel = 'critical';
          actionRequired = 'Create and publish privacy policy immediately';
        }
        break;

      case RuleCategory.CONSENT_MANAGEMENT:
        if (merchantData.implementedControls.includes('consent_management')) {
          currentStatus = 'compliant';
          riskLevel = 'low';
        } else {
          riskLevel = 'high';
          actionRequired = 'Implement consent management system';
        }
        break;

      case RuleCategory.DATA_SUBJECT_RIGHTS:
        if (merchantData.implementedControls.includes('dsar_workflow')) {
          currentStatus = 'partial';
          riskLevel = 'medium';
          actionRequired = 'Enhance data subject rights workflow';
        } else {
          riskLevel = 'high';
          actionRequired = 'Implement data subject rights management';
        }
        break;

      case RuleCategory.COOKIE_MANAGEMENT:
        if (merchantData.implementedControls.includes('cookie_consent')) {
          currentStatus = 'compliant';
          riskLevel = 'low';
        } else {
          riskLevel = 'medium';
          actionRequired = 'Implement cookie consent management';
        }
        break;

      default:
        // Default analysis
        if (
          merchantData.implementedControls.includes(
            rule.category.toLowerCase(),
          )
        ) {
          currentStatus = 'partial';
          riskLevel = 'medium';
        }
    }

    // Adjust risk based on requirement level
    if (rule.requirement === ComplianceRequirement.MANDATORY) {
      if (currentStatus === 'non_compliant') {
        riskLevel =
          riskLevel === 'low'
            ? 'medium'
            : riskLevel === 'medium'
              ? 'high'
              : 'critical';
      }
    }

    return {
      rule,
      currentStatus,
      riskLevel,
      actionRequired,
      deadline: this.calculateDeadline(rule, currentStatus),
    };
  }

  private getRuleWeight(requirement: ComplianceRequirement): number {
    switch (requirement) {
      case ComplianceRequirement.MANDATORY:
        return 10;
      case ComplianceRequirement.RECOMMENDED:
        return 5;
      case ComplianceRequirement.OPTIONAL:
        return 1;
      default:
        return 5;
    }
  }

  private getRiskScore(riskLevel: string): number {
    switch (riskLevel) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  private calculateDeadline(
    rule: RegulatoryRule,
    status: string,
  ): Date | undefined {
    if (status === 'compliant') return undefined;

    const now = new Date();
    let daysToAdd = 30; // Default 30 days

    if (rule.requirement === ComplianceRequirement.MANDATORY) {
      daysToAdd = status === 'non_compliant' ? 15 : 30;
    } else {
      daysToAdd = 60;
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  async seedInitialRules(): Promise<void> {
    const existingRules = await this.regulatoryRuleRepository.count();
    if (existingRules > 0) {
      this.logger.log('Regulatory rules already exist, skipping seed');
      return;
    }

    this.logger.log('Seeding initial regulatory rules...');

    const initialRules: Partial<RegulatoryRule>[] = [
      {
        regulation: RegulationType.GDPR,
        category: RuleCategory.PRIVACY_POLICY,
        title: 'Privacy Policy Publication',
        description:
          'Organizations must publish a clear and comprehensive privacy policy',
        legalReference: 'GDPR Article 13, 14',
        requirement: ComplianceRequirement.MANDATORY,
        implementationGuidance: {
          steps: [
            'Draft privacy policy covering all data processing activities',
            'Include all required GDPR elements',
            'Publish on website and make easily accessible',
            'Review and update regularly',
          ],
          bestPractices: [
            'Use clear, plain language',
            'Include contact information for data protection officer',
            'Provide policy in multiple languages if serving international customers',
          ],
          commonMistakes: [
            'Using generic templates without customization',
            'Failing to update after business changes',
            'Making policy difficult to find or access',
          ],
          resources: [
            {
              title: 'GDPR Privacy Policy Template',
              url: 'https://gdpr.eu/privacy-notice/',
              type: 'template',
            },
          ],
        },
        applicabilityConditions: {
          businessTypes: ['ecommerce', 'saas', 'marketplace'],
          dataTypes: ['personal_data'],
          jurisdictions: ['EU', 'UK'],
        },
        penalties: {
          fineRange: 'Up to 4% of annual turnover or €20 million',
          maxFineAmount: 20000000,
          currency: 'EUR',
          additionalConsequences: [
            'Regulatory investigation',
            'Reputational damage',
          ],
        },
        isActive: true,
        effectiveDate: new Date('2018-05-25'),
        lastUpdated: new Date(),
      },
    ];

    await this.regulatoryRuleRepository.save(initialRules);
    this.logger.log(`Seeded ${initialRules.length} regulatory rules`);
  }

  async updateRule(
    id: string,
    updates: Partial<RegulatoryRule>,
  ): Promise<RegulatoryRule | null> {
    await this.regulatoryRuleRepository.update(id, {
      ...updates,
      lastUpdated: new Date(),
    });
    return this.regulatoryRuleRepository.findOne({ where: { id } });
  }

  getAllRegulations(): RegulationType[] {
    return Object.values(RegulationType);
  }

  getAllCategories(): RuleCategory[] {
    return Object.values(RuleCategory);
  }
}