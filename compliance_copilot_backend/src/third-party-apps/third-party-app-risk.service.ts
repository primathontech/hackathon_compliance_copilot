import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ThirdPartyApp,
  AppRiskAssessment,
  RiskLevel,
  AppCategory,
  DataAccessLevel,
} from './third-party-app-risk.entity';
import { Merchant } from '../entities/merchant.entity';

export interface AppRiskAnalysis {
  appId: string;
  appName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
  }>;
  recommendations: string[];
  complianceGaps: Array<{
    regulation: string;
    requirement: string;
    description: string;
    remediation: string;
  }>;
}

export interface ShopifyAppData {
  id: string;
  title: string;
  handle: string;
  description?: string;
  developer?: {
    name: string;
    website?: string;
  };
  installation_date?: string;
  app_store_app_url?: string;
  embedded?: boolean;
  pos?: {
    embedded?: boolean;
  };
  privacy_policy_url?: string;
  webhooks?: Array<{
    topic: string;
    endpoint: string;
  }>;
  requested_access_scopes?: string[];
}

@Injectable()
export class ThirdPartyAppRiskService {
  private readonly logger = new Logger(ThirdPartyAppRiskService.name);

  // Risk scoring weights
  private readonly riskWeights = {
    dataAccess: 0.3,
    permissions: 0.25,
    compliance: 0.2,
    security: 0.15,
    reputation: 0.1,
  };

  // Known high-risk permission patterns
  private readonly highRiskPermissions = [
    'read_customers',
    'write_customers',
    'read_orders',
    'write_orders',
    'read_all_orders',
    'write_all_orders',
    'read_users',
    'write_users',
    'read_script_tags',
    'write_script_tags',
  ];

  constructor(
    @InjectRepository(ThirdPartyApp)
    private thirdPartyAppRepository: Repository<ThirdPartyApp>,
    @InjectRepository(AppRiskAssessment)
    private riskAssessmentRepository: Repository<AppRiskAssessment>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async scanShopifyApps(merchantId: string): Promise<ThirdPartyApp[]> {
    this.logger.log(`Scanning Shopify apps for merchant ${merchantId}`);

    // In a real implementation, this would use Shopify Admin API
    // For now, we'll simulate the scanning process
    const simulatedApps = await this.simulateShopifyAppScan(merchantId);

    // Clear existing apps for this merchant
    await this.thirdPartyAppRepository.delete({ merchantId });

    const detectedApps: ThirdPartyApp[] = [];

    for (const appData of simulatedApps) {
      const app = await this.processShopifyApp(merchantId, appData);
      detectedApps.push(app);
    }

    this.logger.log(
      `Detected ${detectedApps.length} apps for merchant ${merchantId}`,
    );

    return detectedApps;
  }

  async performRiskAssessment(merchantId: string): Promise<AppRiskAssessment> {
    this.logger.log(`Performing risk assessment for merchant ${merchantId}`);

    const apps = await this.thirdPartyAppRepository.find({
      where: { merchantId, isActive: true },
    });

    const riskAnalyses: AppRiskAnalysis[] = [];
    let totalRiskScore = 0;
    let highRiskApps = 0;
    let mediumRiskApps = 0;
    let lowRiskApps = 0;

    for (const app of apps) {
      const analysis = this.analyzeAppRisk(app);
      riskAnalyses.push(analysis);

      // Update app with risk assessment
      app.riskLevel = analysis.riskLevel;
      app.riskScore = analysis.riskScore;
      app.complianceIssues = analysis.riskFactors.map((factor) => ({
        severity: factor.severity,
        category: factor.category,
        description: factor.description,
        recommendation: `Address ${factor.category.toLowerCase()} risk`,
        resolved: false,
      }));
      app.lastRiskAssessment = new Date();

      await this.thirdPartyAppRepository.save(app);

      // Count by risk level
      switch (analysis.riskLevel) {
        case RiskLevel.HIGH:
        case RiskLevel.CRITICAL:
          highRiskApps++;
          break;
        case RiskLevel.MEDIUM:
          mediumRiskApps++;
          break;
        case RiskLevel.LOW:
          lowRiskApps++;
          break;
      }

      totalRiskScore += analysis.riskScore;
    }

    const overallRiskScore = apps.length > 0 ? totalRiskScore / apps.length : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskAnalyses);

    // Identify compliance gaps
    const complianceGaps = this.identifyComplianceGaps(riskAnalyses);

    // Calculate risk breakdown
    const riskBreakdown = this.calculateRiskBreakdown(riskAnalyses);

    // Create assessment record
    const assessment = this.riskAssessmentRepository.create({
      merchantId,
      totalApps: apps.length,
      highRiskApps,
      mediumRiskApps,
      lowRiskApps,
      overallRiskScore: Math.round(overallRiskScore),
      riskBreakdown,
      recommendations,
      complianceGaps,
    });

    const savedAssessment = await this.riskAssessmentRepository.save(assessment);

    this.logger.log(
      `Risk assessment completed for merchant ${merchantId}: ${apps.length} apps, overall risk score: ${Math.round(overallRiskScore)}`,
    );

    return savedAssessment;
  }

  async getAppsByMerchant(merchantId: string): Promise<ThirdPartyApp[]> {
    return this.thirdPartyAppRepository.find({
      where: { merchantId, isActive: true },
      order: { riskScore: 'DESC', appName: 'ASC' },
    });
  }

  async getLatestRiskAssessment(
    merchantId: string,
  ): Promise<AppRiskAssessment | null> {
    return this.riskAssessmentRepository.findOne({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  private async simulateShopifyAppScan(
    merchantId: string,
  ): Promise<ShopifyAppData[]> {
    // Simulate Shopify app data - in real implementation, use Shopify Admin API
    return [
      {
        id: 'app_123',
        title: 'Google Analytics Enhanced Ecommerce',
        handle: 'google-analytics',
        description: 'Track your store performance with Google Analytics',
        developer: {
          name: 'Google',
          website: 'https://google.com',
        },
        installation_date: '2024-01-15T10:00:00Z',
        privacy_policy_url: 'https://policies.google.com/privacy',
        requested_access_scopes: [
          'read_orders',
          'read_customers',
          'read_products',
          'write_script_tags',
        ],
        webhooks: [
          {
            topic: 'orders/create',
            endpoint: 'https://analytics.google.com/webhook',
          },
        ],
      },
      {
        id: 'app_456',
        title: 'Mailchimp Email Marketing',
        handle: 'mailchimp',
        description: 'Email marketing and automation platform',
        developer: {
          name: 'Mailchimp',
          website: 'https://mailchimp.com',
        },
        installation_date: '2024-02-01T14:30:00Z',
        privacy_policy_url: 'https://mailchimp.com/legal/privacy/',
        requested_access_scopes: [
          'read_customers',
          'write_customers',
          'read_orders',
        ],
        webhooks: [
          {
            topic: 'customers/create',
            endpoint: 'https://mailchimp.com/webhook',
          },
        ],
      },
      {
        id: 'app_789',
        title: 'Custom Analytics Dashboard',
        handle: 'custom-analytics',
        description: 'Custom analytics solution',
        developer: {
          name: 'Unknown Developer',
        },
        installation_date: '2024-03-01T09:15:00Z',
        requested_access_scopes: [
          'read_all_orders',
          'read_customers',
          'read_products',
          'read_inventory',
          'write_script_tags',
        ],
      },
    ];
  }

  private async processShopifyApp(
    merchantId: string,
    appData: ShopifyAppData,
  ): Promise<ThirdPartyApp> {
    const category = this.categorizeApp(appData.title, appData.description);
    const dataAccessLevel = this.determineDataAccessLevel(
      appData.requested_access_scopes || [],
    );

    const app = this.thirdPartyAppRepository.create({
      merchantId,
      appId: appData.id,
      appName: appData.title,
      developer: appData.developer?.name,
      category,
      description: appData.description,
      installedAt: appData.installation_date
        ? new Date(appData.installation_date)
        : new Date(),
      permissions: {
        scopes: appData.requested_access_scopes || [],
        dataAccess: this.extractDataAccess(appData.requested_access_scopes || []),
        webhooks: appData.webhooks?.map((w) => w.topic) || [],
        apiEndpoints: [],
      },
      dataAccessLevel,
      riskFactors: {
        dataTypes: this.extractDataTypes(appData.requested_access_scopes || []),
        thirdPartySharing: true,
        encryptionStatus: 'unknown',
        complianceCertifications: [],
        privacyPolicyUrl: appData.privacy_policy_url,
        dataRetentionPeriod: 'unknown',
        dataLocation: 'unknown',
      },
    });

    return this.thirdPartyAppRepository.save(app);
  }

  private analyzeAppRisk(app: ThirdPartyApp): AppRiskAnalysis {
    const riskFactors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let riskScore = 0;

    // Analyze data access permissions
    const dataAccessRisk = this.analyzeDataAccessRisk(app);
    riskFactors.push(...dataAccessRisk.factors);
    riskScore += dataAccessRisk.score * this.riskWeights.dataAccess;

    // Analyze permission scope
    const permissionRisk = this.analyzePermissionRisk(app);
    riskFactors.push(...permissionRisk.factors);
    riskScore += permissionRisk.score * this.riskWeights.permissions;

    // Analyze compliance posture
    const complianceRisk = this.analyzeComplianceRisk(app);
    riskFactors.push(...complianceRisk.factors);
    riskScore += complianceRisk.score * this.riskWeights.compliance;

    // Analyze security factors
    const securityRisk = this.analyzeSecurityRisk(app);
    riskFactors.push(...securityRisk.factors);
    riskScore += securityRisk.score * this.riskWeights.security;

    // Analyze developer reputation
    const reputationRisk = this.analyzeReputationRisk(app);
    riskFactors.push(...reputationRisk.factors);
    riskScore += reputationRisk.score * this.riskWeights.reputation;

    const finalRiskScore = Math.min(100, Math.max(0, Math.round(riskScore)));
    const riskLevel = this.calculateRiskLevel(finalRiskScore);

    return {
      appId: app.appId,
      appName: app.appName,
      riskLevel,
      riskScore: finalRiskScore,
      riskFactors,
      recommendations: this.generateAppRecommendations(app, riskFactors),
      complianceGaps: this.identifyAppComplianceGaps(app),
    };
  }

  private categorizeApp(title: string, description?: string): AppCategory {
    const text = `${title} ${description || ''}`.toLowerCase();

    if (text.includes('analytics') || text.includes('tracking')) {
      return AppCategory.ANALYTICS;
    }
    if (text.includes('marketing') || text.includes('email')) {
      return AppCategory.MARKETING;
    }
    if (text.includes('customer') || text.includes('support')) {
      return AppCategory.CUSTOMER_SERVICE;
    }
    if (text.includes('inventory') || text.includes('stock')) {
      return AppCategory.INVENTORY;
    }
    if (text.includes('shipping') || text.includes('fulfillment')) {
      return AppCategory.SHIPPING;
    }
    if (text.includes('payment') || text.includes('checkout')) {
      return AppCategory.PAYMENT;
    }
    if (text.includes('social') || text.includes('facebook') || text.includes('instagram')) {
      return AppCategory.SOCIAL_MEDIA;
    }
    if (text.includes('review') || text.includes('rating')) {
      return AppCategory.REVIEWS;
    }
    if (text.includes('accounting') || text.includes('finance')) {
      return AppCategory.ACCOUNTING;
    }

    return AppCategory.OTHER;
  }

  private determineDataAccessLevel(scopes: string[]): DataAccessLevel {
    const writeScopes = scopes.filter((scope) => scope.includes('write'));
    const readAllScopes = scopes.filter((scope) => scope.includes('read_all'));

    if (writeScopes.length > 3 || readAllScopes.length > 0) {
      return DataAccessLevel.FULL_ACCESS;
    }
    if (writeScopes.length > 0) {
      return DataAccessLevel.READ_WRITE;
    }
    return DataAccessLevel.READ_ONLY;
  }

  private extractDataAccess(scopes: string[]): string[] {
    return scopes
      .map((scope) => {
        if (scope.includes('customers')) return 'customer_data';
        if (scope.includes('orders')) return 'order_data';
        if (scope.includes('products')) return 'product_data';
        if (scope.includes('inventory')) return 'inventory_data';
        if (scope.includes('users')) return 'user_data';
        return scope;
      })
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }

  private extractDataTypes(scopes: string[]): string[] {
    const dataTypes: string[] = [];
    if (scopes.some((s) => s.includes('customers'))) {
      dataTypes.push('personal_data', 'contact_information');
    }
    if (scopes.some((s) => s.includes('orders'))) {
      dataTypes.push('transaction_data', 'payment_information');
    }
    if (scopes.some((s) => s.includes('products'))) {
      dataTypes.push('product_data');
    }
    return dataTypes;
  }

  private analyzeDataAccessRisk(app: ThirdPartyApp) {
    const factors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let score = 0;

    if (app.dataAccessLevel === DataAccessLevel.FULL_ACCESS) {
      factors.push({
        category: 'Data Access',
        severity: 'critical' as const,
        description: 'App has full access to store data',
        impact: 'Complete data exposure risk',
      });
      score += 80;
    } else if (app.dataAccessLevel === DataAccessLevel.READ_WRITE) {
      factors.push({
        category: 'Data Access',
        severity: 'high' as const,
        description: 'App can read and modify store data',
        impact: 'Data modification and exposure risk',
      });
      score += 60;
    }

    // Check for sensitive data access
    const sensitiveData = app.riskFactors?.dataTypes?.filter((type) =>
      ['personal_data', 'payment_information'].includes(type),
    );
    if (sensitiveData && sensitiveData.length > 0) {
      factors.push({
        category: 'Sensitive Data',
        severity: 'high' as const,
        description: 'App accesses sensitive personal or payment data',
        impact: 'Privacy and security compliance risk',
      });
      score += 40;
    }

    return { factors, score };
  }

  private analyzePermissionRisk(app: ThirdPartyApp) {
    const factors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let score = 0;

    const scopes = app.permissions?.scopes || [];
    const highRiskCount = scopes.filter((scope) =>
      this.highRiskPermissions.some((pattern) => scope.includes(pattern)),
    ).length;

    if (highRiskCount > 3) {
      factors.push({
        category: 'Permissions',
        severity: 'high' as const,
        description: 'App requests excessive high-risk permissions',
        impact: 'Broad access to sensitive operations',
      });
      score += 70;
    } else if (highRiskCount > 0) {
      factors.push({
        category: 'Permissions',
        severity: 'medium' as const,
        description: 'App requests some high-risk permissions',
        impact: 'Limited access to sensitive operations',
      });
      score += 40;
    }

    return { factors, score };
  }

  private analyzeComplianceRisk(app: ThirdPartyApp) {
    const factors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let score = 0;

    if (!app.riskFactors?.privacyPolicyUrl) {
      factors.push({
        category: 'Compliance',
        severity: 'high' as const,
        description: 'App lacks privacy policy',
        impact: 'GDPR compliance risk',
      });
      score += 60;
    }

    if (app.riskFactors?.dataRetentionPeriod === 'unknown') {
      factors.push({
        category: 'Data Retention',
        severity: 'medium' as const,
        description: 'Data retention period not specified',
        impact: 'Data minimization compliance risk',
      });
      score += 30;
    }

    return { factors, score };
  }

  private analyzeSecurityRisk(app: ThirdPartyApp) {
    const factors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let score = 0;

    if (app.riskFactors?.encryptionStatus === 'unknown') {
      factors.push({
        category: 'Security',
        severity: 'medium' as const,
        description: 'Encryption status unknown',
        impact: 'Data security risk',
      });
      score += 30;
    }

    return { factors, score };
  }

  private analyzeReputationRisk(app: ThirdPartyApp) {
    const factors: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
    }> = [];
    let score = 0;

    if (!app.developer || app.developer === 'Unknown Developer') {
      factors.push({
        category: 'Developer Reputation',
        severity: 'medium' as const,
        description: 'Unknown or unverified developer',
        impact: 'Trust and reliability concerns',
      });
      score += 40;
    }

    return { factors, score };
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private generateAppRecommendations(
    app: ThirdPartyApp,
    riskFactors: any[],
  ): string[] {
    const recommendations: string[] = [];

    if (riskFactors.some((f) => f.category === 'Data Access')) {
      recommendations.push('Review and minimize app data access permissions');
    }

    if (!app.riskFactors?.privacyPolicyUrl) {
      recommendations.push('Request privacy policy from app developer');
    }

    if (app.riskScore > 70) {
      recommendations.push('Consider removing or replacing this high-risk app');
    }

    return recommendations;
  }

  private identifyAppComplianceGaps(app: ThirdPartyApp) {
    const gaps: Array<{
      regulation: string;
      requirement: string;
      description: string;
      remediation: string;
    }> = [];

    if (!app.riskFactors?.privacyPolicyUrl) {
      gaps.push({
        regulation: 'GDPR',
        requirement: 'Article 28 - Processor agreements',
        description: 'Third-party processor lacks privacy policy',
        remediation: 'Obtain data processing agreement and privacy policy',
      });
    }

    return gaps;
  }

  private generateRecommendations(analyses: AppRiskAnalysis[]) {
    const recommendations: Array<{
      priority: 'low' | 'medium' | 'high' | 'urgent';
      category: string;
      description: string;
      actionItems: string[];
      affectedApps: string[];
    }> = [];
    const highRiskApps = analyses.filter((a) => a.riskScore > 70);

    if (highRiskApps.length > 0) {
      recommendations.push({
        priority: 'urgent' as const,
        category: 'High Risk Apps',
        description: `${highRiskApps.length} apps pose high security risks`,
        actionItems: [
          'Review high-risk app permissions',
          'Consider removing unnecessary apps',
          'Implement additional monitoring',
        ],
        affectedApps: highRiskApps.map((a) => a.appName),
      });
    }

    return recommendations;
  }

  private identifyComplianceGaps(analyses: AppRiskAnalysis[]) {
    const gaps: Array<{
      regulation: string;
      requirement: string;
      affectedApps: string[];
      riskLevel: RiskLevel;
      remediation: string;
    }> = [];
    const appsWithoutPrivacyPolicy = analyses.filter(
      (a) => !a.complianceGaps.some((g) => g.regulation === 'GDPR'),
    );

    if (appsWithoutPrivacyPolicy.length > 0) {
      gaps.push({
        regulation: 'GDPR',
        requirement: 'Data Processing Agreements',
        affectedApps: appsWithoutPrivacyPolicy.map((a) => a.appName),
        riskLevel: RiskLevel.HIGH,
        remediation:
          'Obtain data processing agreements from all third-party apps',
      });
    }

    return gaps;
  }

  private calculateRiskBreakdown(analyses: AppRiskAnalysis[]) {
    // Simplified risk breakdown calculation
    return {
      dataAccess: Math.round(
        analyses.reduce((sum, a) => sum + a.riskScore * 0.3, 0) /
          analyses.length,
      ),
      permissions: Math.round(
        analyses.reduce((sum, a) => sum + a.riskScore * 0.25, 0) /
          analyses.length,
      ),
      compliance: Math.round(
        analyses.reduce((sum, a) => sum + a.riskScore * 0.2, 0) /
          analyses.length,
      ),
      security: Math.round(
        analyses.reduce((sum, a) => sum + a.riskScore * 0.15, 0) /
          analyses.length,
      ),
      reputation: Math.round(
        analyses.reduce((sum, a) => sum + a.riskScore * 0.1, 0) /
          analyses.length,
      ),
    };
  }
}
