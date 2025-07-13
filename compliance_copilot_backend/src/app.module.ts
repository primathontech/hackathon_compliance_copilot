import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { RegulatoryKnowledgeModule } from './regulatory/regulatory-knowledge.module';
import { CookieManagementModule } from './cookies/cookie-management.module';
import { ThirdPartyAppRiskModule } from './third-party-apps/third-party-app-risk.module';

// Import entities
import { Merchant } from './entities/merchant.entity';
import { PrivacyPolicy } from './entities/privacy-policy.entity';
import { DataCollectionPoint } from './entities/data-collection-point.entity';
import { ComplianceAudit } from './entities/compliance-audit.entity';
import { DataSubjectRequest } from './entities/data-subject-request.entity';
import { ConsentRecord } from './entities/consent-record.entity';
import { BreachIncident } from './entities/breach-incident.entity';
import { Alert } from './entities/alert.entity';
import { RegulatoryRule } from './regulatory/regulatory-knowledge.entity';
import { DetectedCookie, CookieConsentRecord } from './cookies/cookie-management.entity';
import { ThirdPartyApp, AppRiskAssessment } from './third-party-apps/third-party-app-risk.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'compliance_copilot'),
        entities: [
          Merchant,
          PrivacyPolicy,
          DataCollectionPoint,
          ComplianceAudit,
          DataSubjectRequest,
          ConsentRecord,
          BreachIncident,
          Alert,
          RegulatoryRule,
          DetectedCookie,
          CookieConsentRecord,
          ThirdPartyApp,
          AppRiskAssessment,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    MerchantsModule,
    ComplianceModule,
    MonitoringModule,
    RegulatoryKnowledgeModule,
    CookieManagementModule,
    ThirdPartyAppRiskModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
