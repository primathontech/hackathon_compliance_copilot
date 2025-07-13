import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface PolicyGenerationRequest {
  businessType: string;
  dataTypes: string[];
  jurisdiction: string;
  website?: string;
  contactInfo?: {
    email: string;
    address?: string;
    phone?: string;
  };
  additionalRequirements?: string[];
}

export interface PolicyGenerationResponse {
  privacyPolicy: string;
  cookiePolicy: string;
  termsOfService: string;
  dataRetentionPolicy: string;
  recommendations: string[];
}

export interface ComplianceAnalysisRequest {
  currentPolicy?: string;
  businessData: {
    type: string;
    dataCollection: string[];
    thirdPartyIntegrations: string[];
    dataProcessing: string[];
  };
  jurisdiction: string;
}

export interface ComplianceAnalysisResponse {
  complianceScore: number;
  gaps: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
  nextSteps: string[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    } else {
      this.logger.warn(
        'OpenAI API key not configured. AI features will be disabled.',
      );
    }
  }

  async generatePrivacyPolicy(
    request: PolicyGenerationRequest,
  ): Promise<PolicyGenerationResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const prompt = this.buildPolicyGenerationPrompt(request);
    const model =
      this.configService.get<string>('ai.openai.model') || 'gpt-4o-mini';
    const maxTokens =
      this.configService.get<number>('ai.openai.maxTokens') || 4000;
    const temperature =
      this.configService.get<number>('ai.openai.temperature') || 0.7;

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a legal expert specializing in GDPR compliance and privacy policy generation. Generate comprehensive, legally compliant policies based on the provided business information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parsePolicyResponse(response);
    } catch (error) {
      this.logger.error('Error generating privacy policy:', error);
      throw new Error('Failed to generate privacy policy');
    }
  }

  async analyzeCompliance(
    request: ComplianceAnalysisRequest,
  ): Promise<ComplianceAnalysisResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const prompt = this.buildComplianceAnalysisPrompt(request);
    const model =
      this.configService.get<string>('ai.openai.model') || 'gpt-4o-mini';
    const maxTokens =
      this.configService.get<number>('ai.openai.maxTokens') || 4000;
    const temperature =
      this.configService.get<number>('ai.openai.temperature') || 0.7;

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a GDPR compliance expert. Analyze the provided business information and current policies to identify compliance gaps and provide actionable recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseComplianceResponse(response);
    } catch (error) {
      this.logger.error('Error analyzing compliance:', error);
      throw new Error('Failed to analyze compliance');
    }
  }

  async generateRecommendations(auditFindings: unknown[]): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const prompt = `
Based on the following compliance audit findings, generate specific, actionable recommendations:

${JSON.stringify(auditFindings, null, 2)}

Please provide 5-10 prioritized recommendations that address the most critical compliance gaps.
Format as a JSON array of strings.
`;

    const model =
      this.configService.get<string>('ai.openai.model') || 'gpt-4o-mini';

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a GDPR compliance consultant. Generate practical, actionable recommendations based on audit findings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsed = JSON.parse(response) as string[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Fallback: split by lines and clean up
        return response
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => line.replace(/^[-*]\s*/, '').trim())
          .slice(0, 10);
      }
    } catch (error) {
      this.logger.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  private buildPolicyGenerationPrompt(
    request: PolicyGenerationRequest,
  ): string {
    return `
Generate comprehensive GDPR-compliant policies for a business with the following details:

Business Type: ${request.businessType}
Data Types Collected: ${request.dataTypes.join(', ')}
Jurisdiction: ${request.jurisdiction}
Website: ${request.website || 'Not provided'}
Contact Email: ${request.contactInfo?.email || 'Not provided'}
Contact Address: ${request.contactInfo?.address || 'Not provided'}
Additional Requirements: ${request.additionalRequirements?.join(', ') || 'None'}

Please generate the following policies in JSON format:
{
  "privacyPolicy": "Complete privacy policy text",
  "cookiePolicy": "Complete cookie policy text", 
  "termsOfService": "Complete terms of service text",
  "dataRetentionPolicy": "Complete data retention policy text",
  "recommendations": ["Array of implementation recommendations"]
}

Ensure all policies are:
- GDPR compliant
- Specific to the business type and data collection practices
- Include all required legal clauses
- Written in clear, understandable language
- Include contact information for data protection inquiries
`;
  }

  private buildComplianceAnalysisPrompt(
    request: ComplianceAnalysisRequest,
  ): string {
    return `
Analyze GDPR compliance for a business with the following information:

Business Type: ${request.businessData.type}
Data Collection: ${request.businessData.dataCollection.join(', ')}
Third-party Integrations: ${request.businessData.thirdPartyIntegrations.join(', ')}
Data Processing Activities: ${request.businessData.dataProcessing.join(', ')}
Jurisdiction: ${request.jurisdiction}

Current Policy: ${request.currentPolicy || 'No existing policy provided'}

Please analyze compliance and respond in JSON format:
{
  "complianceScore": 85,
  "gaps": [
    {
      "category": "Data Subject Rights",
      "severity": "high",
      "description": "Missing clear process for data deletion requests",
      "recommendation": "Implement automated data deletion workflow"
    }
  ],
  "recommendations": ["Array of general recommendations"],
  "nextSteps": ["Array of immediate action items"]
}

Focus on:
- GDPR Article compliance
- Data subject rights implementation
- Consent management
- Data security measures
- Cross-border data transfers
- Record keeping requirements
`;
  }

  private parsePolicyResponse(response: string): PolicyGenerationResponse {
    try {
      const parsed = JSON.parse(response) as Record<string, unknown>;
      return {
        privacyPolicy: (parsed.privacyPolicy as string) || '',
        cookiePolicy: (parsed.cookiePolicy as string) || '',
        termsOfService: (parsed.termsOfService as string) || '',
        dataRetentionPolicy: (parsed.dataRetentionPolicy as string) || '',
        recommendations: (parsed.recommendations as string[]) || [],
      };
    } catch (error) {
      this.logger.error('Error parsing policy response:', error);
      // Fallback: return basic structure
      return {
        privacyPolicy: response,
        cookiePolicy: '',
        termsOfService: '',
        dataRetentionPolicy: '',
        recommendations: [],
      };
    }
  }

  private parseComplianceResponse(
    response: string,
  ): ComplianceAnalysisResponse {
    try {
      const parsed = JSON.parse(response) as Record<string, unknown>;
      return {
        complianceScore: (parsed.complianceScore as number) || 0,
        gaps: (parsed.gaps as ComplianceAnalysisResponse['gaps']) || [],
        recommendations: (parsed.recommendations as string[]) || [],
        nextSteps: (parsed.nextSteps as string[]) || [],
      };
    } catch (error) {
      this.logger.error('Error parsing compliance response:', error);
      // Fallback: return basic structure
      return {
        complianceScore: 0,
        gaps: [],
        recommendations: [response],
        nextSteps: [],
      };
    }
  }
}
