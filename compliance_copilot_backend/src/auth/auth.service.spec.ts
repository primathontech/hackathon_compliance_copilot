import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, JwtPayload, AuthResult } from './auth.service';
import { ShopifyService } from './shopify.service';
import { Merchant } from '../entities/merchant.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let shopifyService: ShopifyService;
  let merchantRepository: Repository<Merchant>;
  // let configService: ConfigService;

  const mockMerchant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    shopifyShopId: '12345',
    shopDomain: 'test-shop.myshopify.com',
    shopName: 'Test Shop',
    accessToken: 'test-access-token',
    subscriptionPlan: 'free' as const,
    complianceStatus: 'pending' as const,
    webhookVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShopInfo = {
    id: 12345,
    name: 'Test Shop',
    domain: 'test-shop.myshopify.com',
    email: 'test@example.com',
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-jwt-token'),
    verify: jest.fn().mockReturnValue({
      sub: mockMerchant.id,
      shopifyShopId: mockMerchant.shopifyShopId,
      shopDomain: mockMerchant.shopDomain,
    }),
  };

  const mockShopifyService = {
    exchangeCodeForToken: jest.fn().mockResolvedValue('test-access-token'),
    getShopInfo: jest.fn().mockResolvedValue(mockShopInfo),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ShopifyService,
          useValue: mockShopifyService,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    shopifyService = module.get<ShopifyService>(ShopifyService);
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    // configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateShopifyInstall', () => {
    it('should successfully handle Shopify install for new merchant', async () => {
      const shop = 'test-shop.myshopify.com';
      const code = 'test-auth-code';

      mockMerchantRepository.findOne.mockResolvedValue(null);
      mockMerchantRepository.create.mockReturnValue(mockMerchant);
      mockMerchantRepository.save.mockResolvedValue(mockMerchant);

      const result: AuthResult = await service.validateShopifyInstall(
        shop,
        code,
      );

      expect(shopifyService.exchangeCodeForToken).toHaveBeenCalledWith(
        shop,
        code,
      );
      expect(shopifyService.getShopInfo).toHaveBeenCalledWith(
        shop,
        'test-access-token',
      );
      expect(merchantRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockMerchant.id,
        shopifyShopId: mockMerchant.shopifyShopId,
        shopDomain: mockMerchant.shopDomain,
      });
      expect(result).toEqual({
        access_token: 'test-jwt-token',
        merchant: mockMerchant,
      });
    });

    it('should successfully handle Shopify install for existing merchant', async () => {
      const shop = 'test-shop.myshopify.com';
      const code = 'test-auth-code';

      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockMerchantRepository.save.mockResolvedValue({
        ...mockMerchant,
        accessToken: 'test-access-token',
      });

      const result: AuthResult = await service.validateShopifyInstall(
        shop,
        code,
      );

      expect(shopifyService.exchangeCodeForToken).toHaveBeenCalledWith(
        shop,
        code,
      );
      expect(merchantRepository.save).toHaveBeenCalledWith({
        ...mockMerchant,
        accessToken: 'test-access-token',
        shopName: mockShopInfo.name,
        shopDomain: mockShopInfo.domain,
      });
      expect(result).toEqual({
        access_token: 'test-jwt-token',
        merchant: expect.objectContaining({
          accessToken: 'test-access-token',
        }),
      });
    });

    it('should throw UnauthorizedException when Shopify token exchange fails', async () => {
      const shop = 'test-shop.myshopify.com';
      const code = 'invalid-code';

      mockShopifyService.exchangeCodeForToken.mockRejectedValue(
        new Error('Invalid authorization code'),
      );

      await expect(service.validateShopifyInstall(shop, code)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('should return merchant when valid payload is provided', async () => {
      const payload: JwtPayload = {
        sub: mockMerchant.id,
        shopifyShopId: mockMerchant.shopifyShopId,
        shopDomain: mockMerchant.shopDomain,
      };

      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);

      const result = await service.validateJwtPayload(payload);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
      expect(result).toEqual(mockMerchant);
    });

    it('should throw UnauthorizedException when merchant not found', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-id',
        shopifyShopId: '12345',
        shopDomain: 'test-shop.myshopify.com',
      };

      mockMerchantRepository.findOne.mockResolvedValue(null);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new JWT token for valid merchant', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);

      const result = await service.refreshToken(mockMerchant.id);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMerchant.id },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockMerchant.id,
        shopifyShopId: mockMerchant.shopifyShopId,
        shopDomain: mockMerchant.shopDomain,
      });
      expect(result).toBe('test-jwt-token');
    });

    it('should throw UnauthorizedException when merchant not found', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('non-existent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMerchantByShopDomain', () => {
    it('should return merchant when found by shop domain', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);

      const result = await service.getMerchantByShopDomain(
        mockMerchant.shopDomain,
      );

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { shopDomain: mockMerchant.shopDomain },
      });
      expect(result).toEqual(mockMerchant);
    });

    it('should return null when merchant not found', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(null);

      const result = await service.getMerchantByShopDomain(
        'non-existent-shop.myshopify.com',
      );

      expect(result).toBeNull();
    });
  });

  describe('updateMerchantWebhookStatus', () => {
    it('should update merchant webhook status', async () => {
      mockMerchantRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateMerchantWebhookStatus(mockMerchant.id, true);

      expect(merchantRepository.update).toHaveBeenCalledWith(mockMerchant.id, {
        webhookVerified: true,
      });
    });
  });
});
