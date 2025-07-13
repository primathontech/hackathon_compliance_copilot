import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { AlertService } from './alert.service';
import { MonitoringController } from './monitoring.controller';
import { Alert } from '../entities/alert.entity';
import { Merchant } from '../entities/merchant.entity';
import { ComplianceAudit } from '../entities/compliance-audit.entity';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { ConsentRecord } from '../entities/consent-record.entity';
import { BreachIncident } from '../entities/breach-incident.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alert,
      Merchant,
      ComplianceAudit,
      DataSubjectRequest,
      ConsentRecord,
      BreachIncident,
    ]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, AlertService],
  exports: [MonitoringService, AlertService],
})
export class MonitoringModule {}
