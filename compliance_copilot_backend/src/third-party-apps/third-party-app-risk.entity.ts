import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Merchant } from '../entities/merchant.entity';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AppCategory {
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  CUSTOMER_SERVICE = 'customer_service',
  INVENTORY = 'inventory',
  SHIPPING = 'shipping',
  PAYMENT = 'payment',
  SOCIAL_MEDIA = 'social_media',
  REVIEWS = 'reviews',
  EMAIL_MARKETING = 'email_marketing',
  ACCOUNTING = 'accounting',
  OTHER = 'other',
}

export enum DataAccessLevel {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  FULL_ACCESS = 'full_access',
  ADMIN = 'admin',
}

@Entity('third_party_apps')
@Index(['merchantId', 'appId'])
export class ThirdPartyApp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ length: 255 })
  appId: string;

  @Column({ length: 255 })
  appName: string;

  @Column({ length: 255, nullable: true })
  developer: string;

  @Column({
    type: 'enum',
    enum: AppCategory,
    default: AppCategory.OTHER,
  })
  category: AppCategory;

  @Column('text', { nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  version: string;

  @Column({ type: 'timestamp', nullable: true })
  installedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @Column('jsonb', { nullable: true })
  permissions: {
    scopes: string[];
    dataAccess: string[];
    webhooks: string[];
    apiEndpoints: string[];
  };

  @Column({
    type: 'enum',
    enum: DataAccessLevel,
    default: DataAccessLevel.READ_ONLY,
  })
  dataAccessLevel: DataAccessLevel;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel;

  @Column('int', { default: 50 })
  riskScore: number;

  @Column('jsonb', { nullable: true })
  riskFactors: {
    dataTypes: string[];
    thirdPartySharing: boolean;
    encryptionStatus: string;
    complianceCertifications: string[];
    privacyPolicyUrl?: string;
    dataRetentionPeriod?: string;
    dataLocation?: string;
  };

  @Column('jsonb', { nullable: true })
  complianceIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    recommendation: string;
    resolved: boolean;
  }>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRiskAssessment: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('app_risk_assessments')
@Index(['merchantId', 'createdAt'])
export class AppRiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column('int')
  totalApps: number;

  @Column('int')
  highRiskApps: number;

  @Column('int')
  mediumRiskApps: number;

  @Column('int')
  lowRiskApps: number;

  @Column('int')
  overallRiskScore: number;

  @Column('jsonb')
  riskBreakdown: {
    dataAccess: number;
    permissions: number;
    compliance: number;
    security: number;
    reputation: number;
  };

  @Column('jsonb')
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    description: string;
    actionItems: string[];
    affectedApps: string[];
  }>;

  @Column('jsonb', { nullable: true })
  complianceGaps: Array<{
    regulation: string;
    requirement: string;
    affectedApps: string[];
    riskLevel: RiskLevel;
    remediation: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}