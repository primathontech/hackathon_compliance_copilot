import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from '../entities/alert.entity';
import { Merchant } from '../entities/merchant.entity';

export interface CreateAlertDto {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  merchantId: string;
  metadata?: Record<string, any>;
  sourceId?: string;
  sourceType?: string;
  expiresAt?: Date;
}

export interface UpdateAlertDto {
  status?: AlertStatus;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface AlertFilters {
  merchantId?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async createAlert(createAlertDto: CreateAlertDto): Promise<Alert> {
    try {
      // Verify merchant exists
      const merchant = await this.merchantRepository.findOne({
        where: { id: createAlertDto.merchantId },
      });

      if (!merchant) {
        throw new Error(
          `Merchant with ID ${createAlertDto.merchantId} not found`,
        );
      }

      const alert = this.alertRepository.create({
        ...createAlertDto,
        status: AlertStatus.ACTIVE,
      });

      const savedAlert = await this.alertRepository.save(alert);

      this.logger.log(
        `Alert created: ${savedAlert.id} for merchant ${createAlertDto.merchantId}`,
      );

      // TODO: Trigger notification system
      this.triggerNotifications(savedAlert);

      return savedAlert;
    } catch (error) {
      this.logger.error(
        `Failed to create alert: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getAlerts(filters: AlertFilters = {}): Promise<Alert[]> {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.merchant', 'merchant')
      .orderBy('alert.createdAt', 'DESC');

    if (filters.merchantId) {
      queryBuilder.andWhere('alert.merchantId = :merchantId', {
        merchantId: filters.merchantId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('alert.type = :type', { type: filters.type });
    }

    if (filters.severity) {
      queryBuilder.andWhere('alert.severity = :severity', {
        severity: filters.severity,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('alert.status = :status', {
        status: filters.status,
      });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('alert.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('alert.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    return queryBuilder.getMany();
  }

  async getActiveAlerts(merchantId?: string): Promise<Alert[]> {
    return this.getAlerts({
      merchantId,
      status: AlertStatus.ACTIVE,
    });
  }

  async getAlertById(id: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  async updateAlert(
    id: string,
    updateAlertDto: UpdateAlertDto,
  ): Promise<Alert> {
    const alert = await this.getAlertById(id);

    if (
      updateAlertDto.status === AlertStatus.ACKNOWLEDGED &&
      !alert.acknowledgedAt
    ) {
      updateAlertDto.acknowledgedBy = updateAlertDto.acknowledgedBy || 'system';
      alert.acknowledgedAt = new Date();
    }

    if (updateAlertDto.status === AlertStatus.RESOLVED && !alert.resolvedAt) {
      updateAlertDto.resolvedBy = updateAlertDto.resolvedBy || 'system';
      alert.resolvedAt = new Date();
    }

    Object.assign(alert, updateAlertDto);

    const updatedAlert = await this.alertRepository.save(alert);

    this.logger.log(`Alert updated: ${id} - Status: ${updateAlertDto.status}`);

    return updatedAlert;
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert> {
    return this.updateAlert(id, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy,
    });
  }

  async resolveAlert(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<Alert> {
    return this.updateAlert(id, {
      status: AlertStatus.RESOLVED,
      resolvedBy,
      resolutionNotes,
    });
  }

  async dismissAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, {
      status: AlertStatus.DISMISSED,
    });
  }

  async getAlertStats(merchantId?: string): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<AlertType, number>;
  }> {
    const queryBuilder = this.alertRepository.createQueryBuilder('alert');

    if (merchantId) {
      queryBuilder.where('alert.merchantId = :merchantId', { merchantId });
    }

    const alerts = await queryBuilder.getMany();

    const stats = {
      total: alerts.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
      bySeverity: {
        [AlertSeverity.LOW]: 0,
        [AlertSeverity.MEDIUM]: 0,
        [AlertSeverity.HIGH]: 0,
        [AlertSeverity.CRITICAL]: 0,
      },
      byType: {
        [AlertType.COMPLIANCE_VIOLATION]: 0,
        [AlertType.DATA_BREACH]: 0,
        [AlertType.POLICY_UPDATE_REQUIRED]: 0,
        [AlertType.CONSENT_EXPIRY]: 0,
        [AlertType.DATA_RETENTION_VIOLATION]: 0,
        [AlertType.AUDIT_FAILURE]: 0,
        [AlertType.SYSTEM_ERROR]: 0,
      },
    };

    alerts.forEach((alert) => {
      // Count by status
      switch (alert.status) {
        case AlertStatus.ACTIVE:
          stats.active++;
          break;
        case AlertStatus.ACKNOWLEDGED:
          stats.acknowledged++;
          break;
        case AlertStatus.RESOLVED:
          stats.resolved++;
          break;
        case AlertStatus.DISMISSED:
          stats.dismissed++;
          break;
      }

      // Count by severity
      stats.bySeverity[alert.severity]++;

      // Count by type
      stats.byType[alert.type]++;
    });

    return stats;
  }

  async cleanupExpiredAlerts(): Promise<number> {
    const result = await this.alertRepository
      .createQueryBuilder()
      .delete()
      .from(Alert)
      .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: new Date() })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired alerts`);
    return result.affected || 0;
  }

  private triggerNotifications(alert: Alert): void {
    // TODO: Implement notification system integration
    // This could include:
    // - Email notifications
    // - Webhook notifications
    // - Real-time WebSocket notifications
    // - Slack/Teams notifications

    this.logger.debug(`Triggering notifications for alert ${alert.id}`);

    // For now, just log the alert
    if (
      alert.severity === AlertSeverity.CRITICAL ||
      alert.severity === AlertSeverity.HIGH
    ) {
      this.logger.warn(
        `HIGH/CRITICAL ALERT: ${alert.title} - ${alert.description}`,
      );
    }
  }

  // Utility methods for creating specific alert types
  async createComplianceViolationAlert(
    merchantId: string,
    title: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.COMPLIANCE_VIOLATION,
      severity: AlertSeverity.HIGH,
      title,
      description,
      merchantId,
      metadata,
    });
  }

  async createDataBreachAlert(
    merchantId: string,
    title: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.DATA_BREACH,
      severity: AlertSeverity.CRITICAL,
      title,
      description,
      merchantId,
      metadata,
    });
  }

  async createPolicyUpdateAlert(
    merchantId: string,
    title: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.POLICY_UPDATE_REQUIRED,
      severity: AlertSeverity.MEDIUM,
      title,
      description,
      merchantId,
      metadata,
    });
  }

  async createConsentExpiryAlert(
    merchantId: string,
    title: string,
    description: string,
    expiresAt: Date,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.CONSENT_EXPIRY,
      severity: AlertSeverity.MEDIUM,
      title,
      description,
      merchantId,
      metadata,
      expiresAt,
    });
  }
}
