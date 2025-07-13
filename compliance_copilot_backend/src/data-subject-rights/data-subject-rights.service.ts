import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { Merchant } from '../entities/merchant.entity';

export interface CreateDataSubjectRequestDto {
  merchantId: string;
  requestType:
    | 'access'
    | 'portability'
    | 'rectification'
    | 'erasure'
    | 'restriction'
    | 'objection';
  customerEmail: string;
  customerId?: string;
  description?: string;
  requestData?: Record<string, unknown>;
}

export interface UpdateRequestStatusDto {
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  responseData?: Record<string, unknown>;
  completedAt?: Date;
}

export interface DataExportResult {
  personalData: Record<string, unknown>;
  dataCategories: string[];
  processingPurposes: string[];
  legalBasis: string[];
  retentionPeriods: Record<string, string>;
  thirdPartySharing: Array<{
    recipient: string;
    purpose: string;
    dataTypes: string[];
  }>;
  exportedAt: Date;
  [key: string]: unknown; // Index signature for TypeScript compatibility
}

@Injectable()
export class DataSubjectRightsService {
  private readonly logger = new Logger(DataSubjectRightsService.name);

  constructor(
    @InjectRepository(DataSubjectRequest)
    private dataSubjectRequestRepository: Repository<DataSubjectRequest>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async createRequest(
    createDto: CreateDataSubjectRequestDto,
  ): Promise<DataSubjectRequest> {
    this.logger.log(
      `Creating data subject request for merchant ${createDto.merchantId}`,
    );

    // Verify merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: createDto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const request = this.dataSubjectRequestRepository.create({
      merchantId: createDto.merchantId,
      requestType: createDto.requestType,
      customerEmail: createDto.customerEmail,
      customerId: createDto.customerId,
      status: 'pending',
      priority: this.calculatePriority(createDto.requestType),
      deadline: this.calculateDeadline(createDto.requestType),
      requestData: createDto.requestData || {
        userAgent: 'Web Request',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
        description: createDto.description,
      },
    });

    const savedRequest = await this.dataSubjectRequestRepository.save(request);

    this.logger.log(
      `Created data subject request ${savedRequest.id} for ${createDto.customerEmail}`,
    );

    return savedRequest;
  }

  async getRequestsByMerchant(
    merchantId: string,
  ): Promise<DataSubjectRequest[]> {
    return this.dataSubjectRequestRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRequestById(requestId: string): Promise<DataSubjectRequest> {
    const request = await this.dataSubjectRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    return request;
  }

  async updateRequestStatus(
    requestId: string,
    updateDto: UpdateRequestStatusDto,
  ): Promise<DataSubjectRequest> {
    const request = await this.getRequestById(requestId);

    request.status = updateDto.status;
    request.responseData = updateDto.responseData || request.responseData;

    if (updateDto.status === 'completed' && updateDto.completedAt) {
      request.completedAt = updateDto.completedAt;
    }

    const updatedRequest =
      await this.dataSubjectRequestRepository.save(request);

    this.logger.log(
      `Updated request ${requestId} status to ${updateDto.status}`,
    );

    return updatedRequest;
  }

  async processAccessRequest(requestId: string): Promise<DataExportResult> {
    const request = await this.getRequestById(requestId);

    if (request.requestType !== 'access') {
      throw new Error('Request is not an access request');
    }

    // Update status to processing
    await this.updateRequestStatus(requestId, { status: 'processing' });

    // Simulate data collection from various sources
    const exportResult: DataExportResult = {
      personalData: {
        email: request.customerEmail,
        customerId: request.customerId,
        // Simulate collected data
        orders: await this.collectOrderData(request.customerEmail),
        profile: await this.collectProfileData(request.customerEmail),
        preferences: await this.collectPreferencesData(request.customerEmail),
        interactions: await this.collectInteractionData(request.customerEmail),
      },
      dataCategories: [
        'Contact Information',
        'Order History',
        'Payment Information',
        'Behavioral Data',
        'Preferences',
      ],
      processingPurposes: [
        'Order Processing',
        'Customer Support',
        'Marketing Communications',
        'Analytics',
        'Legal Compliance',
      ],
      legalBasis: [
        'Contract Performance',
        'Legitimate Interest',
        'Consent',
        'Legal Obligation',
      ],
      retentionPeriods: {
        'Contact Information': '7 years after last interaction',
        'Order History': '7 years for tax purposes',
        'Payment Information': '1 year after transaction',
        'Marketing Data': 'Until consent withdrawn',
        'Analytics Data': '2 years',
      },
      thirdPartySharing: [
        {
          recipient: 'Payment Processor',
          purpose: 'Payment Processing',
          dataTypes: ['Payment Information', 'Order Details'],
        },
        {
          recipient: 'Shipping Provider',
          purpose: 'Order Fulfillment',
          dataTypes: ['Contact Information', 'Shipping Address'],
        },
        {
          recipient: 'Analytics Provider',
          purpose: 'Website Analytics',
          dataTypes: ['Behavioral Data', 'Device Information'],
        },
      ],
      exportedAt: new Date(),
    };

    // Update request with export data
    await this.updateRequestStatus(requestId, {
      status: 'completed',
      responseData: exportResult,
      completedAt: new Date(),
    });

    this.logger.log(`Completed access request ${requestId}`);

    return exportResult;
  }

  async processErasureRequest(requestId: string): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (request.requestType !== 'erasure') {
      throw new Error('Request is not an erasure request');
    }

    // Update status to processing
    await this.updateRequestStatus(requestId, { status: 'processing' });

    // Simulate data deletion process
    const deletionResult = {
      deletedRecords: {
        customerProfile: 1,
        orderHistory: await this.countOrderRecords(request.customerEmail),
        marketingPreferences: 1,
        analyticsData: await this.countAnalyticsRecords(request.customerEmail),
      },
      retainedRecords: {
        legallyRequired: [
          'Tax records (7 years)',
          'Fraud prevention data (5 years)',
        ],
      },
      deletionDate: new Date(),
    };

    // Update request as completed
    await this.updateRequestStatus(requestId, {
      status: 'completed',
      responseData: deletionResult,
      completedAt: new Date(),
    });

    this.logger.log(`Completed erasure request ${requestId}`);
  }

  async processPortabilityRequest(requestId: string): Promise<Buffer> {
    const request = await this.getRequestById(requestId);

    if (request.requestType !== 'portability') {
      throw new Error('Request is not a portability request');
    }

    // Get access data first
    const exportResult = await this.processAccessRequest(requestId);

    // Convert to portable format (JSON)
    const portableData = {
      dataSubject: {
        email: request.customerEmail,
        customerId: request.customerId,
      },
      exportDate: new Date().toISOString(),
      data: exportResult.personalData,
      metadata: {
        dataCategories: exportResult.dataCategories,
        processingPurposes: exportResult.processingPurposes,
        legalBasis: exportResult.legalBasis,
      },
    };

    // Convert to JSON buffer
    const jsonData = JSON.stringify(portableData, null, 2);
    return Buffer.from(jsonData, 'utf-8');
  }

  async getRequestStatistics(merchantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageProcessingTime: number;
    overdueRequests: number;
  }> {
    const requests = await this.getRequestsByMerchant(merchantId);

    const stats = {
      total: requests.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      averageProcessingTime: 0,
      overdueRequests: 0,
    };

    // Calculate statistics
    const completedRequests = requests.filter((r) => r.completedAt);
    const now = new Date();

    requests.forEach((request) => {
      // Count by status
      stats.byStatus[request.status] =
        (stats.byStatus[request.status] || 0) + 1;

      // Count by type
      stats.byType[request.requestType] =
        (stats.byType[request.requestType] || 0) + 1;

      // Count overdue requests
      if (
        request.deadline &&
        request.deadline < now &&
        request.status !== 'completed'
      ) {
        stats.overdueRequests++;
      }
    });

    // Calculate average processing time
    if (completedRequests.length > 0) {
      const totalProcessingTime = completedRequests.reduce((sum, request) => {
        const processingTime =
          request.completedAt.getTime() - request.createdAt.getTime();
        return sum + processingTime;
      }, 0);

      stats.averageProcessingTime =
        totalProcessingTime / completedRequests.length;
    }

    return stats;
  }

  private calculatePriority(
    requestType: string,
  ): 'low' | 'normal' | 'high' | 'urgent' {
    switch (requestType) {
      case 'erasure':
      case 'restriction':
        return 'high';
      case 'access':
      case 'portability':
        return 'normal';
      case 'rectification':
      case 'objection':
        return 'low';
      default:
        return 'normal';
    }
  }

  private calculateDeadline(requestType: string): Date {
    const now = new Date();
    // GDPR requires response within 30 days, but some requests are more urgent
    const daysToAdd = requestType === 'erasure' ? 15 : 30;
    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  // Mock data collection methods
  private collectOrderData(_email: string): Promise<unknown[]> {
    // Simulate order data collection
    return Promise.resolve([
      {
        orderId: 'ORD-001',
        date: '2024-01-15',
        total: 99.99,
        items: ['Product A', 'Product B'],
      },
    ]);
  }

  private collectProfileData(email: string): Promise<Record<string, unknown>> {
    return Promise.resolve({
      email,
      registrationDate: '2023-06-15',
      lastLogin: '2024-01-20',
      preferences: {
        newsletter: true,
        smsUpdates: false,
      },
    });
  }

  private collectPreferencesData(
    _email: string,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve({
      language: 'en',
      currency: 'USD',
      marketingConsent: true,
      cookieConsent: true,
    });
  }

  private collectInteractionData(_email: string): Promise<unknown[]> {
    return Promise.resolve([
      {
        type: 'page_view',
        page: '/products/example',
        timestamp: '2024-01-20T10:30:00Z',
      },
      {
        type: 'purchase',
        orderId: 'ORD-001',
        timestamp: '2024-01-15T14:22:00Z',
      },
    ]);
  }

  private countOrderRecords(_email: string): Promise<number> {
    // Simulate counting order records
    return Promise.resolve(5);
  }

  private countAnalyticsRecords(_email: string): Promise<number> {
    // Simulate counting analytics records
    return Promise.resolve(150);
  }
}
