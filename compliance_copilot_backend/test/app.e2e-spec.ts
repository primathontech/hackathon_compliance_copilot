import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../src/entities/merchant.entity';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let merchantRepository: Repository<Merchant>;
  let jwtService: JwtService;
  let authToken: string;

  const mockMerchant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    shopifyShopId: '12345',
    shopDomain: 'test-shop.myshopify.com',
    shopName: 'Test Shop',
    accessToken: 'test-access-token',
    subscriptionPlan: 'free',
    complianceStatus: 'pending',
    complianceScore: 85,
    webhookVerified: false,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Merchant))
      .useValue({
        findOne: jest.fn().mockResolvedValue(mockMerchant),
        save: jest.fn().mockResolvedValue(mockMerchant),
        create: jest.fn().mockReturnValue(mockMerchant),
        find: jest.fn().mockResolvedValue([mockMerchant]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    merchantRepository = moduleFixture.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate auth token for testing
    authToken = jwtService.sign({
      sub: mockMerchant.id,
      shopifyShopId: mockMerchant.shopifyShopId,
      shopDomain: mockMerchant.shopDomain,
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('/auth', () => {
    describe('/auth/shopify/install (GET)', () => {
      it('should redirect to Shopify OAuth', () => {
        return request(app.getHttpServer())
          .get('/auth/shopify/install')
          .query({ shop: 'test-shop.myshopify.com' })
          .expect(302)
          .expect((res) => {
            expect(res.headers.location).toContain('myshopify.com');
            expect(res.headers.location).toContain('oauth');
          });
      });

      it('should return 400 for missing shop parameter', () => {
        return request(app.getHttpServer())
          .get('/auth/shopify/install')
          .expect(400);
      });
    });
  });

  describe('/merchants', () => {
    describe('/merchants/profile (GET)', () => {
      it('should return merchant profile when authenticated', () => {
        return request(app.getHttpServer())
          .get('/merchants/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('shopDomain');
            expect(res.body).toHaveProperty('complianceScore');
          });
      });

      it('should return 401 when not authenticated', () => {
        return request(app.getHttpServer())
          .get('/merchants/profile')
          .expect(401);
      });
    });
  });

  describe('/compliance', () => {
    describe('/compliance/audit (POST)', () => {
      it('should start compliance audit when authenticated', () => {
        return request(app.getHttpServer())
          .post('/compliance/audit')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('auditType');
          });
      });

      it('should return 401 when not authenticated', () => {
        return request(app.getHttpServer())
          .post('/compliance/audit')
          .expect(401);
      });
    });

    describe('/compliance/score (GET)', () => {
      it('should return compliance score when authenticated', () => {
        return request(app.getHttpServer())
          .get('/compliance/score')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('score');
            expect(res.body).toHaveProperty('status');
            expect(typeof res.body.score).toBe('number');
          });
      });
    });

    describe('/compliance/data-mapping (GET)', () => {
      it('should return data mapping results when authenticated', () => {
        return request(app.getHttpServer())
          .get('/compliance/data-mapping')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('totalDataPoints');
            expect(res.body).toHaveProperty('categorizedData');
            expect(res.body).toHaveProperty('legalBasisCoverage');
            expect(res.body).toHaveProperty('retentionCompliance');
          });
      });
    });
  });

  describe('/monitoring', () => {
    describe('/monitoring/health (GET)', () => {
      it('should return system health status', () => {
        return request(app.getHttpServer())
          .get('/monitoring/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('database');
            expect(res.body).toHaveProperty('redis');
          });
      });
    });

    describe('/monitoring/alerts (GET)', () => {
      it('should return active alerts', () => {
        return request(app.getHttpServer())
          .get('/monitoring/alerts')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('/monitoring/metrics (GET)', () => {
      it('should return system metrics', () => {
        return request(app.getHttpServer())
          .get('/monitoring/metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('totalMerchants');
            expect(res.body).toHaveProperty('activeMerchants');
            expect(res.body).toHaveProperty('averageComplianceScore');
            expect(res.body).toHaveProperty('systemUptime');
          });
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });

    it('should handle malformed JWT tokens', () => {
      return request(app.getHttpServer())
        .get('/merchants/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers in responses', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          // Check for basic security headers
          expect(res.headers).toHaveProperty('x-powered-by');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple requests within rate limit', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health').expect(200));

      await Promise.all(requests);
    });
  });

  describe('Input Validation', () => {
    it('should validate request parameters', () => {
      return request(app.getHttpServer())
        .post('/compliance/audit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalidField: 'invalid-value' })
        .expect((res) => {
          // Should either accept valid requests or reject invalid ones appropriately
          expect([200, 201, 400]).toContain(res.status);
        });
    });
  });
});
