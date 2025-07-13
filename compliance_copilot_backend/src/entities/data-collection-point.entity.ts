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

@Entity('data_collection_points')
export class DataCollectionPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'collection_type', length: 100 })
  collectionType: string;

  @Column({ name: 'data_categories', type: 'text', array: true })
  dataCategories: string[];

  @Column({ type: 'text' })
  purpose: string;

  @Column({ name: 'legal_basis', length: 100 })
  legalBasis: string;

  @Column({ name: 'retention_period', type: 'int', nullable: true })
  retentionPeriod: number;

  @Column({ name: 'third_party_sharing', default: false })
  thirdPartySharing: boolean;

  @Column({ name: 'data_source', nullable: true })
  dataSource: string;

  @Column({ name: 'processing_location', nullable: true })
  processingLocation: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Merchant, (merchant) => merchant.dataCollectionPoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
