import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceAudit } from '../entities/compliance-audit.entity';
import { DataCollectionPoint } from '../entities/data-collection-point.entity';
import { PrivacyPolicy } from '../entities/privacy-policy.entity';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceAudit,
      DataCollectionPoint,
      PrivacyPolicy,
    ]),
    MerchantsModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
