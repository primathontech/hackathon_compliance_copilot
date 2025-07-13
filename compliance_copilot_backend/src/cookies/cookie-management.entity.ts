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

export enum CookieCategory {
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  PERSONALIZATION = 'personalization',
}

export enum CookieConsentStatus {
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  EXEMPT = 'exempt',
}

export enum CookieSource {
  FIRST_PARTY = 'first_party',
  THIRD_PARTY = 'third_party',
}

@Entity('detected_cookies')
@Index(['merchantId', 'name', 'domain'])
export class DetectedCookie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  domain: string;

  @Column('text', { nullable: true })
  value: string;

  @Column({ length: 255, nullable: true })
  path: string;

  @Column({ type: 'timestamp', nullable: true })
  expires: Date;

  @Column({ default: false })
  httpOnly: boolean;

  @Column({ default: false })
  secure: boolean;

  @Column({ length: 50, nullable: true })
  sameSite: string;

  @Column({
    type: 'enum',
    enum: CookieCategory,
    default: CookieCategory.ESSENTIAL,
  })
  category: CookieCategory;

  @Column({
    type: 'enum',
    enum: CookieSource,
    default: CookieSource.FIRST_PARTY,
  })
  source: CookieSource;

  @Column({
    type: 'enum',
    enum: CookieConsentStatus,
    default: CookieConsentStatus.REQUIRED,
  })
  consentStatus: CookieConsentStatus;

  @Column('text', { nullable: true })
  purpose: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    provider?: string;
    dataSharing?: boolean;
    retentionPeriod?: string;
    dataTypes?: string[];
    processingPurposes?: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cookie_consent_records')
@Index(['merchantId', 'sessionId'])
export class CookieConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ length: 255, nullable: true })
  sessionId: string;

  @Column({ length: 255, nullable: true })
  userId: string;

  @Column('jsonb')
  consentChoices: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    social_media: boolean;
    advertising: boolean;
    personalization: boolean;
  };

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column({ length: 255, nullable: true })
  consentMethod: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isWithdrawn: boolean;

  @Column({ type: 'timestamp', nullable: true })
  withdrawnAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}