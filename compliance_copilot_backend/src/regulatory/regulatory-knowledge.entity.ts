import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RegulationType {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  PIPEDA = 'pipeda',
  UK_GDPR = 'uk_gdpr',
  LGPD = 'lgpd',
  PDPA = 'pdpa',
}

export enum RuleCategory {
  DATA_COLLECTION = 'data_collection',
  CONSENT_MANAGEMENT = 'consent_management',
  DATA_RETENTION = 'data_retention',
  DATA_SUBJECT_RIGHTS = 'data_subject_rights',
  CROSS_BORDER_TRANSFER = 'cross_border_transfer',
  BREACH_NOTIFICATION = 'breach_notification',
  PRIVACY_POLICY = 'privacy_policy',
  COOKIE_MANAGEMENT = 'cookie_management',
}

export enum ComplianceRequirement {
  MANDATORY = 'mandatory',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
}

@Entity('regulatory_rules')
@Index(['regulation', 'category', 'isActive'])
export class RegulatoryRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RegulationType,
  })
  regulation: RegulationType;

  @Column({
    type: 'enum',
    enum: RuleCategory,
  })
  category: RuleCategory;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  legalReference: string;

  @Column({
    type: 'enum',
    enum: ComplianceRequirement,
    default: ComplianceRequirement.MANDATORY,
  })
  requirement: ComplianceRequirement;

  @Column('jsonb', { nullable: true })
  implementationGuidance: {
    steps: string[];
    bestPractices: string[];
    commonMistakes: string[];
    resources: Array<{
      title: string;
      url: string;
      type: 'documentation' | 'template' | 'tool';
    }>;
  };

  @Column('jsonb', { nullable: true })
  applicabilityConditions: {
    businessTypes: string[];
    dataTypes: string[];
    jurisdictions: string[];
    thresholds?: {
      employeeCount?: number;
      annualRevenue?: number;
      dataSubjectCount?: number;
    };
  };

  @Column('jsonb', { nullable: true })
  penalties: {
    fineRange: string;
    maxFineAmount?: number;
    currency?: string;
    additionalConsequences: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}