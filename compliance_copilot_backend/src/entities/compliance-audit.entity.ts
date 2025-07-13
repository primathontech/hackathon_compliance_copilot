import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity('compliance_audits')
export class ComplianceAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'audit_type', length: 100 })
  auditType: string;

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'risk_score', type: 'int', nullable: true })
  riskScore: number;

  @Column({ type: 'jsonb', nullable: true })
  findings: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  recommendations: Record<string, any>;

  @Column({ name: 'audit_data', type: 'jsonb', nullable: true })
  auditData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.complianceAudits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
