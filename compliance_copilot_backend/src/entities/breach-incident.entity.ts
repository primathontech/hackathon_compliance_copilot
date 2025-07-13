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

@Entity('breach_incidents')
export class BreachIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'incident_type', length: 100 })
  incidentType: string;

  @Column({ length: 50 })
  severity: string;

  @Column({ name: 'affected_records', type: 'int', nullable: true })
  affectedRecords: number;

  @Column({ type: 'text' })
  description: string;

  @Column({
    default: 'investigating',
    enum: ['investigating', 'contained', 'resolved', 'closed'],
  })
  status: string;

  @Column({ name: 'reported_to_authority', default: false })
  reportedToAuthority: boolean;

  @Column({ name: 'authority_reference', nullable: true })
  authorityReference: string;

  @Column({ name: 'incident_data', type: 'jsonb', nullable: true })
  incidentData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.breachIncidents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
