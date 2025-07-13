import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PrivacyPolicy } from './privacy-policy.entity';
import { DataCollectionPoint } from './data-collection-point.entity';
import { ComplianceAudit } from './compliance-audit.entity';
import { DataSubjectRequest } from './data-subject-request.entity';
import { ConsentRecord } from './consent-record.entity';
import { BreachIncident } from './breach-incident.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'shopify_shop_id' })
  shopifyShopId: string;

  @Column({ name: 'shop_domain' })
  shopDomain: string;

  @Column({ name: 'shop_name' })
  shopName: string;

  @Column({ type: 'text', name: 'access_token' })
  accessToken: string;

  @Column({
    name: 'subscription_plan',
    default: 'free',
    enum: ['free', 'basic', 'premium', 'enterprise'],
  })
  subscriptionPlan: string;

  @Column({
    name: 'compliance_status',
    default: 'pending',
    enum: ['pending', 'compliant', 'non_compliant', 'under_review'],
  })
  complianceStatus: string;

  @Column({ name: 'compliance_score', type: 'int', default: 0 })
  complianceScore: number;

  @Column({ name: 'last_audit_date', type: 'timestamp', nullable: true })
  lastAuditDate: Date;

  @Column({ name: 'webhook_verified', default: false })
  webhookVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => PrivacyPolicy, (policy) => policy.merchant)
  privacyPolicies: PrivacyPolicy[];

  @OneToMany(() => DataCollectionPoint, (point) => point.merchant)
  dataCollectionPoints: DataCollectionPoint[];

  @OneToMany(() => ComplianceAudit, (audit) => audit.merchant)
  complianceAudits: ComplianceAudit[];

  @OneToMany(() => DataSubjectRequest, (request) => request.merchant)
  dataSubjectRequests: DataSubjectRequest[];

  @OneToMany(() => ConsentRecord, (consent) => consent.merchant)
  consentRecords: ConsentRecord[];

  @OneToMany(() => BreachIncident, (incident) => incident.merchant)
  breachIncidents: BreachIncident[];
}
