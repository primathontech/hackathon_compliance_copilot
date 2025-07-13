import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ShopifyService } from './shopify.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ShopifyAuthGuard } from './guards/shopify-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Merchant } from '../entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Merchant]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ShopifyService,
    JwtStrategy,
    ShopifyAuthGuard,
    JwtAuthGuard,
  ],
  exports: [AuthService, ShopifyService, JwtAuthGuard],
})
export class AuthModule {}
