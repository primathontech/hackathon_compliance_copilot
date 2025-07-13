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

@Entity('data_subject_requests')
export class DataSubjectRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'request_type', length: 50 })
  requestType: string;

  @Column({ name: 'customer_email' })
  customerEmail: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @Column({
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'rejected'],
  })
  status: string;

  @Column({ name: 'request_data', type: 'jsonb', nullable: true })
  requestData: Record<string, any>;

  @Column({ name: 'response_data', type: 'jsonb', nullable: true })
  responseData: Record<string, any>;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({
    name: 'priority',
    default: 'normal',
    enum: ['low', 'normal', 'high', 'urgent'],
  })
  priority: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.dataSubjectRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
