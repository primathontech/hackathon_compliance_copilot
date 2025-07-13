import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DetectedCookie,
  CookieConsentRecord,
} from './cookie-management.entity';
import { CookieManagementService } from './cookie-management.service';
import { CookieManagementController } from './cookie-management.controller';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DetectedCookie, CookieConsentRecord]),
    MerchantsModule,
  ],
  controllers: [CookieManagementController],
  providers: [CookieManagementService],
  exports: [CookieManagementService],
})
export class CookieManagementModule {}