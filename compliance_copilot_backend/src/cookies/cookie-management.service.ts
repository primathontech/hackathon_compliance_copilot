import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DetectedCookie,
  CookieConsentRecord,
  CookieCategory,
  CookieSource,
  CookieConsentStatus,
} from './cookie-management.entity';
import { Merchant } from '../entities/merchant.entity';

export interface CookieScanResult {
  totalCookies: number;
  categorizedCookies: {
    essential: number;
    functional: number;
    analytics: number;
    marketing: number;
    social_media: number;
    advertising: number;
    personalization: number;
  };
  thirdPartyCookies: number;
  complianceIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  consentRequirements: {
    requiresBanner: boolean;
    optInRequired: boolean;
    categories: CookieCategory[];
  };
}

export interface CookieConsentConfiguration {
  merchantId: string;
  bannerSettings: {
    position: 'top' | 'bottom' | 'center';
    theme: 'light' | 'dark' | 'custom';
    customColors?: {
      background: string;
      text: string;
      accent: string;
    };
    showLogo: boolean;
    companyName: string;
  };
  consentOptions: {
    granularConsent: boolean;
    categories: Array<{
      category: CookieCategory;
      required: boolean;
      defaultEnabled: boolean;
      description: string;
    }>;
  };
  legalSettings: {
    jurisdiction: string;
    privacyPolicyUrl: string;
    cookiePolicyUrl: string;
    consentDuration: number; // days
  };
}

@Injectable()
export class CookieManagementService {
  private readonly logger = new Logger(CookieManagementService.name);

  // Known cookie patterns for automatic categorization
  private readonly cookiePatterns = {
    [CookieCategory.ESSENTIAL]: [
      /^(session|sess|phpsessid|jsessionid|asp\.net_sessionid)/i,
      /^(csrf|xsrf|security)/i,
      /^(auth|login|user)/i,
      /^(cart|basket|checkout)/i,
    ],
    [CookieCategory.ANALYTICS]: [
      /^(_ga|_gid|_gat|__utm)/i,
      /^(analytics|tracking|stats)/i,
      /^(_hjid|_hjIncludedInSample)/i,
      /^(mixpanel|amplitude)/i,
    ],
    [CookieCategory.MARKETING]: [
      /^(_fbp|_fbc|fr)/i,
      /^(ads|adnxs|doubleclick)/i,
      /^(marketing|campaign)/i,
      /^(mailchimp|klaviyo)/i,
    ],
    [CookieCategory.SOCIAL_MEDIA]: [
      /^(twitter|linkedin|instagram)/i,
      /^(social|share|like)/i,
      /^(youtube|vimeo)/i,
    ],
    [CookieCategory.ADVERTISING]: [
      /^(google_ads|adsystem)/i,
      /^(criteo|outbrain|taboola)/i,
      /^(retargeting|remarketing)/i,
    ],
    [CookieCategory.FUNCTIONAL]: [
      /^(preferences|settings|config)/i,
      /^(language|locale|timezone)/i,
      /^(theme|layout)/i,
    ],
  };

  constructor(
    @InjectRepository(DetectedCookie)
    private detectedCookieRepository: Repository<DetectedCookie>,
    @InjectRepository(CookieConsentRecord)
    private consentRecordRepository: Repository<CookieConsentRecord>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async scanWebsiteCookies(
    merchantId: string,
    websiteUrl: string,
  ): Promise<CookieScanResult> {
    this.logger.log(`Starting cookie scan for merchant ${merchantId}`);

    // In a real implementation, this would use a headless browser to scan the website
    // For now, we'll simulate the scanning process
    const simulatedCookies = await this.simulateCookieScan(websiteUrl);

    // Clear existing cookies for this merchant
    await this.detectedCookieRepository.delete({ merchantId });

    // Process and categorize cookies
    const categorizedCookies = {
      essential: 0,
      functional: 0,
      analytics: 0,
      marketing: 0,
      social_media: 0,
      advertising: 0,
      personalization: 0,
    };

    let thirdPartyCookies = 0;
    const complianceIssues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }> = [];

    for (const cookieData of simulatedCookies) {
      const category = this.categorizeCookie(cookieData.name, cookieData.domain);
      const source = this.determineCookieSource(cookieData.domain, websiteUrl);

      if (source === CookieSource.THIRD_PARTY) {
        thirdPartyCookies++;
      }

      // Create detected cookie record
      const detectedCookie = this.detectedCookieRepository.create({
        merchantId,
        name: cookieData.name,
        domain: cookieData.domain,
        value: cookieData.value,
        path: cookieData.path,
        expires: cookieData.expires || undefined,
        httpOnly: cookieData.httpOnly,
        secure: cookieData.secure,
        sameSite: cookieData.sameSite,
        category,
        source,
        consentStatus: this.determineConsentStatus(category),
        purpose: this.getCookiePurpose(cookieData.name, category),
        description: this.getCookieDescription(cookieData.name, category),
        metadata: this.getCookieMetadata(cookieData.name, cookieData.domain),
        lastSeen: new Date(),
      });

      await this.detectedCookieRepository.save(detectedCookie);

      // Count by category
      categorizedCookies[category]++;

      // Check for compliance issues
      const issues = this.checkCookieCompliance(detectedCookie);
      complianceIssues.push(...issues);
    }

    // Determine consent requirements
    const consentRequirements = this.determineConsentRequirements(
      categorizedCookies,
      thirdPartyCookies,
    );

    const result: CookieScanResult = {
      totalCookies: simulatedCookies.length,
      categorizedCookies,
      thirdPartyCookies,
      complianceIssues,
      consentRequirements,
    };

    this.logger.log(
      `Cookie scan completed for merchant ${merchantId}: ${result.totalCookies} cookies found`,
    );

    return result;
  }

  async getCookiesByMerchant(merchantId: string): Promise<DetectedCookie[]> {
    return this.detectedCookieRepository.find({
      where: { merchantId, isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async updateCookieCategory(
    cookieId: string,
    category: CookieCategory,
    purpose?: string,
  ): Promise<DetectedCookie> {
    const cookie = await this.detectedCookieRepository.findOne({
      where: { id: cookieId },
    });

    if (!cookie) {
      throw new Error('Cookie not found');
    }

    cookie.category = category;
    cookie.consentStatus = this.determineConsentStatus(category);
    if (purpose) {
      cookie.purpose = purpose;
    }

    return this.detectedCookieRepository.save(cookie);
  }

  async recordConsent(
    merchantId: string,
    consentData: {
      sessionId?: string;
      userId?: string;
      consentChoices: Record<string, boolean>;
      ipAddress?: string;
      userAgent?: string;
      consentMethod?: string;
    },
  ): Promise<CookieConsentRecord> {
    const consentRecord = this.consentRecordRepository.create({
      merchantId,
      sessionId: consentData.sessionId,
      userId: consentData.userId,
      consentChoices: {
        essential: consentData.consentChoices.essential ?? true,
        functional: consentData.consentChoices.functional ?? false,
        analytics: consentData.consentChoices.analytics ?? false,
        marketing: consentData.consentChoices.marketing ?? false,
        social_media: consentData.consentChoices.social_media ?? false,
        advertising: consentData.consentChoices.advertising ?? false,
        personalization: consentData.consentChoices.personalization ?? false,
      },
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      consentMethod: consentData.consentMethod || 'banner',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    return this.consentRecordRepository.save(consentRecord);
  }

  async generateConsentBannerConfig(
    merchantId: string,
  ): Promise<CookieConsentConfiguration> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    const cookies = await this.getCookiesByMerchant(merchantId);
    const categories = [...new Set(cookies.map((c) => c.category))];

    return {
      merchantId,
      bannerSettings: {
        position: 'bottom',
        theme: 'light',
        showLogo: true,
        companyName: merchant?.shopName || 'Your Store',
      },
      consentOptions: {
        granularConsent: true,
        categories: categories.map((category) => ({
          category,
          required: category === CookieCategory.ESSENTIAL,
          defaultEnabled: category === CookieCategory.ESSENTIAL,
          description: this.getCategoryDescription(category),
        })),
      },
      legalSettings: {
        jurisdiction: 'EU',
        privacyPolicyUrl: '/privacy-policy',
        cookiePolicyUrl: '/cookie-policy',
        consentDuration: 365,
      },
    };
  }

  private async simulateCookieScan(websiteUrl: string) {
    // Simulate cookie scanning - in real implementation, use Puppeteer
    const domain = new URL(websiteUrl).hostname;

    return [
      {
        name: '_ga',
        domain,
        value: 'GA1.2.123456789.1234567890',
        path: '/',
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'session_id',
        domain,
        value: 'sess_abc123',
        path: '/',
        expires: null,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      },
      {
        name: '_fbp',
        domain: '.facebook.com',
        value: 'fb.1.1234567890.123456789',
        path: '/',
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ];
  }

  private categorizeCookie(name: string, domain: string): CookieCategory {
    for (const [category, patterns] of Object.entries(this.cookiePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          return category as CookieCategory;
        }
      }
    }

    // Default categorization based on domain
    if (domain.includes('google') || domain.includes('analytics')) {
      return CookieCategory.ANALYTICS;
    }
    if (domain.includes('facebook') || domain.includes('twitter')) {
      return CookieCategory.SOCIAL_MEDIA;
    }
    if (domain.includes('ads') || domain.includes('doubleclick')) {
      return CookieCategory.ADVERTISING;
    }

    return CookieCategory.FUNCTIONAL;
  }

  private determineCookieSource(
    cookieDomain: string,
    websiteUrl: string,
  ): CookieSource {
    const websiteDomain = new URL(websiteUrl).hostname;
    return cookieDomain === websiteDomain ||
      cookieDomain === `.${websiteDomain}`
      ? CookieSource.FIRST_PARTY
      : CookieSource.THIRD_PARTY;
  }

  private determineConsentStatus(category: CookieCategory): CookieConsentStatus {
    switch (category) {
      case CookieCategory.ESSENTIAL:
        return CookieConsentStatus.EXEMPT;
      case CookieCategory.FUNCTIONAL:
        return CookieConsentStatus.OPTIONAL;
      default:
        return CookieConsentStatus.REQUIRED;
    }
  }

  private getCookiePurpose(name: string, category: CookieCategory): string {
    const purposes = {
      [CookieCategory.ESSENTIAL]: 'Essential website functionality',
      [CookieCategory.FUNCTIONAL]: 'Enhanced user experience',
      [CookieCategory.ANALYTICS]: 'Website analytics and performance',
      [CookieCategory.MARKETING]: 'Marketing and advertising',
      [CookieCategory.SOCIAL_MEDIA]: 'Social media integration',
      [CookieCategory.ADVERTISING]: 'Targeted advertising',
      [CookieCategory.PERSONALIZATION]: 'Content personalization',
    };

    return purposes[category] || 'Unknown purpose';
  }

  private getCookieDescription(name: string, category: CookieCategory): string {
    // Simplified descriptions - in real implementation, use a comprehensive database
    if (name.startsWith('_ga')) {
      return 'Google Analytics cookie for tracking website usage';
    }
    if (name.includes('session')) {
      return 'Session cookie for maintaining user state';
    }
    if (name.startsWith('_fb')) {
      return 'Facebook pixel cookie for advertising';
    }

    return `${category} cookie`;
  }

  private getCookieMetadata(name: string, domain: string) {
    // Simplified metadata - in real implementation, use comprehensive database
    if (name.startsWith('_ga')) {
      return {
        provider: 'Google Analytics',
        dataSharing: true,
        retentionPeriod: '2 years',
        dataTypes: ['usage_data', 'device_info'],
        processingPurposes: ['analytics', 'performance_monitoring'],
      };
    }

    return {
      provider: domain,
      dataSharing: false,
      retentionPeriod: 'Session',
      dataTypes: ['functional_data'],
      processingPurposes: ['website_functionality'],
    };
  }

  private checkCookieCompliance(cookie: DetectedCookie): Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }> {
    const issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }> = [];

    // Check for non-secure cookies with sensitive data
    if (!cookie.secure && cookie.name.toLowerCase().includes('auth')) {
      issues.push({
        severity: 'high' as const,
        description: `Authentication cookie "${cookie.name}" is not secure`,
        recommendation: 'Set the Secure flag for authentication cookies',
      });
    }

    // Check for missing HttpOnly flag on session cookies
    if (!cookie.httpOnly && cookie.name.toLowerCase().includes('session')) {
      issues.push({
        severity: 'medium' as const,
        description: `Session cookie "${cookie.name}" is accessible via JavaScript`,
        recommendation: 'Set the HttpOnly flag for session cookies',
      });
    }

    // Check for long-lived third-party cookies
    if (
      cookie.source === CookieSource.THIRD_PARTY &&
      cookie.expires &&
      cookie.expires.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000
    ) {
      issues.push({
        severity: 'medium' as const,
        description: `Third-party cookie "${cookie.name}" has excessive retention period`,
        recommendation: 'Review retention period for third-party cookies',
      });
    }

    return issues;
  }

  private determineConsentRequirements(
    categorizedCookies: Record<string, number>,
    thirdPartyCookies: number,
  ) {
    const hasNonEssentialCookies =
      Object.entries(categorizedCookies).some(
        ([category, count]) =>
          category !== 'essential' && count > 0,
      );

    return {
      requiresBanner: hasNonEssentialCookies || thirdPartyCookies > 0,
      optInRequired: thirdPartyCookies > 0 || categorizedCookies.marketing > 0,
      categories: Object.entries(categorizedCookies)
        .filter(([, count]) => count > 0)
        .map(([category]) => category as CookieCategory),
    };
  }

  private getCategoryDescription(category: CookieCategory): string {
    const descriptions = {
      [CookieCategory.ESSENTIAL]:
        'Necessary for the website to function properly',
      [CookieCategory.FUNCTIONAL]:
        'Enable enhanced functionality and personalization',
      [CookieCategory.ANALYTICS]:
        'Help us understand how visitors use our website',
      [CookieCategory.MARKETING]:
        'Used to deliver relevant advertisements',
      [CookieCategory.SOCIAL_MEDIA]:
        'Enable social media features and sharing',
      [CookieCategory.ADVERTISING]:
        'Used for targeted advertising and remarketing',
      [CookieCategory.PERSONALIZATION]:
        'Personalize content and user experience',
    };

    return descriptions[category] || 'Unknown category';
  }
}