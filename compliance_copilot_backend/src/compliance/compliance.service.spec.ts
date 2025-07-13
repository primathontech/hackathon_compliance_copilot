import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  ComplianceService,
  AuditResult,
  DataMappingResult,
} from './compliance.service';
import { ComplianceAudit } from '../entities/compliance-audit.entity';
import { DataCollectionPoint } from '../entities/data-collection-point.entity';
import { PrivacyPolicy } from '../entities/privacy-policy.entity';
import { MerchantsService } from '../merchants/merchants.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let auditRepository: Repository<ComplianceAudit>;
  let dataPointRepository: Repository<DataCollectionPoint>;
  let policyRepository: Repository<PrivacyPolicy>;
  let merchantsService: MerchantsService;

  const mockMerchant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    shopifyShopId: '12345',
    shopDomain: 'test-shop.myshopify.com',
    shopName: 'Test Shop',
    complianceScore: 85,
  };

  const mockAudit = {
    id: 'audit-123',
    merchant: mockMerchant,
    auditType: 'comprehensive',
    status: 'completed',
    riskScore: 15,
    findings: [],
    recommendations: [],
    createdAt: new Date(),
    completedAt: new Date(),
  };

  const mockDataPoint = {
    id: 'dp-123',
    merchant: mockMerchant,
    name: 'Customer Email',
    dataCategories: ['email', 'personal'],
    purpose: 'Order processing and marketing',
    legalBasis: 'consent',
    retentionPeriod: 365,
    isActive: true,
  };

  const mockPolicy = {
    id: 'policy-123',
    merchant: mockMerchant,
    title: 'Privacy Policy',
    content: 'Test policy content',
    status: 'published',
    version: '1.0',
    createdAt: new Date(),
  };

  const mockAuditRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataPointRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPolicyRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMerchantsService = {
    findById: jest.fn(),
    updateComplianceScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: getRepositoryToken(ComplianceAudit),
          useValue: mockAuditRepository,
        },
        {
          provide: getRepositoryToken(DataCollectionPoint),
          useValue: mockDataPointRepository,
        },
        {
          provide: getRepositoryToken(PrivacyPolicy),
          useValue: mockPolicyRepository,
        },
        {
          provide: MerchantsService,
          useValue: mockMerchantsService,
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    auditRepository = module.get<Repository<ComplianceAudit>>(
      getRepositoryToken(ComplianceAudit),
    );
    dataPointRepository = module.get<Repository<DataCollectionPoint>>(
      getRepositoryToken(DataCollectionPoint),
    );
    policyRepository = module.get<Repository<PrivacyPolicy>>(
      getRepositoryToken(PrivacyPolicy),
    );
    merchantsService = module.get<MerchantsService>(MerchantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runComplianceAudit', () => {
    it('should successfully run a compliance audit', async () => {
      const merchantId = mockMerchant.id;

      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);
      mockPolicyRepository.find.mockResolvedValue([mockPolicy]);
      mockDataPointRepository.find.mockResolvedValue([mockDataPoint]);
      mockMerchantsService.updateComplianceScore.mockResolvedValue(undefined);

      const result = await service.runComplianceAudit(merchantId);

      expect(merchantsService.findById).toHaveBeenCalledWith(merchantId);
      expect(auditRepository.create).toHaveBeenCalledWith({
        merchant: mockMerchant,
        auditType: 'comprehensive',
        status: 'processing',
      });
      expect(auditRepository.save).toHaveBeenCalled();
      expect(merchantsService.updateComplianceScore).toHaveBeenCalled();
      expect(result).toEqual(mockAudit);
    });

    it('should handle audit failure and update status', async () => {
      const merchantId = mockMerchant.id;
      const error = new Error('Audit failed');

      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValueOnce(mockAudit);
      mockPolicyRepository.find.mockRejectedValue(error);

      await expect(service.runComplianceAudit(merchantId)).rejects.toThrow(
        'Audit failed',
      );

      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          auditData: { error: 'Audit failed' },
        }),
      );
    });
  });

  describe('getDataMapping', () => {
    it('should return comprehensive data mapping results', async () => {
      const merchantId = mockMerchant.id;
      const dataPoints = [
        {
          ...mockDataPoint,
          dataCategories: ['email', 'name'],
          purpose: 'Marketing campaigns',
          legalBasis: 'consent',
          retentionPeriod: 365,
        },
        {
          ...mockDataPoint,
          id: 'dp-124',
          dataCategories: ['analytics'],
          purpose: 'Website analytics',
          legalBasis: 'legitimate interests',
          retentionPeriod: 730,
        },
        {
          ...mockDataPoint,
          id: 'dp-125',
          dataCategories: ['sensitive'],
          purpose: 'Order processing',
          legalBasis: 'contract',
          retentionPeriod: null,
        },
      ];

      mockDataPointRepository.find.mockResolvedValue(dataPoints);

      const result: DataMappingResult =
        await service.getDataMapping(merchantId);

      expect(dataPointRepository.find).toHaveBeenCalledWith({
        where: { merchant: { id: merchantId } },
      });

      expect(result).toEqual({
        totalDataPoints: 3,
        categorizedData: {
          personal: 1,
          sensitive: 1,
          marketing: 1,
          analytics: 1,
        },
        legalBasisCoverage: {
          consent: 1,
          contract: 1,
          legalObligation: 0,
          vitalInterests: 0,
          publicTask: 0,
          legitimateInterests: 1,
        },
        retentionCompliance: {
          defined: 2,
          undefined: 1,
          excessive: 0,
        },
      });
    });

    it('should handle empty data points', async () => {
      const merchantId = mockMerchant.id;

      mockDataPointRepository.find.mockResolvedValue([]);

      const result = await service.getDataMapping(merchantId);

      expect(result.totalDataPoints).toBe(0);
      expect(result.categorizedData.personal).toBe(0);
      expect(result.legalBasisCoverage.consent).toBe(0);
      expect(result.retentionCompliance.defined).toBe(0);
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history for merchant', async () => {
      const merchantId = mockMerchant.id;
      const audits = [mockAudit];

      mockAuditRepository.find.mockResolvedValue(audits);

      const result = await service.getAuditHistory(merchantId);

      expect(auditRepository.find).toHaveBeenCalledWith({
        where: { merchant: { id: merchantId } },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual(audits);
    });
  });

  describe('getAuditById', () => {
    it('should return audit by ID', async () => {
      const auditId = mockAudit.id;

      mockAuditRepository.findOne.mockResolvedValue(mockAudit);

      const result = await service.getAuditById(auditId);

      expect(auditRepository.findOne).toHaveBeenCalledWith({
        where: { id: auditId },
        relations: ['merchant'],
      });
      expect(result).toEqual(mockAudit);
    });

    it('should throw NotFoundException when audit not found', async () => {
      const auditId = 'non-existent-id';

      mockAuditRepository.findOne.mockResolvedValue(null);

      await expect(service.getAuditById(auditId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('private audit check methods', () => {
    it('should identify missing privacy policy', async () => {
      const merchantId = mockMerchant.id;

      mockPolicyRepository.find.mockResolvedValue([]);
      mockDataPointRepository.find.mockResolvedValue([mockDataPoint]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);

      const result = await service.runComplianceAudit(merchantId);

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Privacy Policy',
            severity: 'critical',
            description: 'No privacy policy found',
          }),
        ]),
      );
    });

    it('should identify unpublished privacy policy', async () => {
      const merchantId = mockMerchant.id;
      const unpublishedPolicy = { ...mockPolicy, status: 'draft' };

      mockPolicyRepository.find.mockResolvedValue([unpublishedPolicy]);
      mockDataPointRepository.find.mockResolvedValue([mockDataPoint]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);

      const result = await service.runComplianceAudit(merchantId);

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Privacy Policy',
            severity: 'high',
            description: 'Privacy policy exists but is not published',
          }),
        ]),
      );
    });

    it('should identify missing data mapping', async () => {
      const merchantId = mockMerchant.id;

      mockPolicyRepository.find.mockResolvedValue([mockPolicy]);
      mockDataPointRepository.find.mockResolvedValue([]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);

      const result = await service.runComplianceAudit(merchantId);

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Data Mapping',
            severity: 'high',
            description: 'No data collection points mapped',
          }),
        ]),
      );
    });

    it('should identify missing legal basis', async () => {
      const merchantId = mockMerchant.id;
      const dataPointWithoutBasis = { ...mockDataPoint, legalBasis: null };

      mockPolicyRepository.find.mockResolvedValue([mockPolicy]);
      mockDataPointRepository.find.mockResolvedValue([dataPointWithoutBasis]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);

      const result = await service.runComplianceAudit(merchantId);

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Legal Basis',
            severity: 'critical',
            description: '1 data collection points lack legal basis',
          }),
        ]),
      );
    });

    it('should identify missing retention policies', async () => {
      const merchantId = mockMerchant.id;
      const dataPointWithoutRetention = {
        ...mockDataPoint,
        retentionPeriod: null,
      };

      mockPolicyRepository.find.mockResolvedValue([mockPolicy]);
      mockDataPointRepository.find.mockResolvedValue([
        dataPointWithoutRetention,
      ]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue(mockAudit);

      const result = await service.runComplianceAudit(merchantId);

      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Data Retention',
            severity: 'medium',
            description: '1 data points lack retention policies',
          }),
        ]),
      );
    });
  });

  describe('compliance status determination', () => {
    it('should return compliant status for high scores', async () => {
      const merchantId = mockMerchant.id;

      mockPolicyRepository.find.mockResolvedValue([mockPolicy]);
      mockDataPointRepository.find.mockResolvedValue([mockDataPoint]);
      mockMerchantsService.findById.mockResolvedValue(mockMerchant);
      mockAuditRepository.create.mockReturnValue(mockAudit);
      mockAuditRepository.save.mockResolvedValue({
        ...mockAudit,
        riskScore: 15, // 85% compliance
      });

      const result = await service.runComplianceAudit(merchantId);

      expect(result.status).toBe('completed');
      expect(result.riskScore).toBe(15);
    });
  });
});
