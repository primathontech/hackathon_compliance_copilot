import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ThirdPartyApp,
  AppRiskAssessment,
} from './third-party-app-risk.entity';
import { ThirdPartyAppRiskService } from './third-party-app-risk.service';
import { ThirdPartyAppRiskController } from './third-party-app-risk.controller';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThirdPartyApp, AppRiskAssessment]),
    MerchantsModule,
  ],
  controllers: [ThirdPartyAppRiskController],
  providers: [ThirdPartyAppRiskService],
  exports: [ThirdPartyAppRiskService],
})
export class ThirdPartyAppRiskModule {}