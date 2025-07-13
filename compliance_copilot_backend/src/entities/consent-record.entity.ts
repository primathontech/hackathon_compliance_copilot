import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'consent_type', length: 100 })
  consentType: string;

  @Column({ name: 'consent_given' })
  consentGiven: boolean;

  @Column({ name: 'consent_method', length: 100, nullable: true })
  consentMethod: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'consent_data', type: 'jsonb', nullable: true })
  consentData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'withdrawn_at', type: 'timestamp', nullable: true })
  withdrawnAt: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.consentRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
