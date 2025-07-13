import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { AlertService } from './alert.service';
import { ComplianceAudit } from '../entities/compliance-audit.entity';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { ConsentRecord } from '../entities/consent-record.entity';
import { BreachIncident } from '../entities/breach-incident.entity';
import { Merchant } from '../entities/merchant.entity';
import { AlertType, AlertSeverity } from '../entities/alert.entity';

export interface MonitoringMetrics {
  totalMerchants: number;
  activeAudits: number;
  pendingRequests: number;
  withdrawnConsents: number;
  breachIncidents: number;
  complianceScore: number;
  alertCounts: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ComplianceHealthCheck {
  merchantId: string;
  overallScore: number;
  issues: Array<{
    type: string;
    severity: AlertSeverity;
    description: string;
    recommendation: string;
  }>;
  lastAuditDate?: Date;
  nextAuditDue?: Date;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly alertService: AlertService,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(ComplianceAudit)
    private auditRepository: Repository<ComplianceAudit>,
    @InjectRepository(DataSubjectRequest)
    private dsrRepository: Repository<DataSubjectRequest>,
    @InjectRepository(ConsentRecord)
    private consentRepository: Repository<ConsentRecord>,
    @InjectRepository(BreachIncident)
    private breachRepository: Repository<BreachIncident>,
  ) {}

  async getMonitoringMetrics(merchantId?: string): Promise<MonitoringMetrics> {
    const whereClause = merchantId ? { merchantId } : {};

    const [
      totalMerchants,
      activeAudits,
      pendingRequests,
      withdrawnConsents,
      breachIncidents,
      alertStats,
    ] = await Promise.all([
      merchantId ? 1 : this.merchantRepository.count(),
      this.auditRepository.count({
        where: { ...whereClause, status: 'in_progress' },
      }),
      this.dsrRepository.count({
        where: { ...whereClause, status: 'pending' },
      }),
      this.consentRepository.count({
        where: {
          ...whereClause,
          withdrawnAt: MoreThan(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          ),
        },
      }),
      this.breachRepository.count({
        where: {
          ...whereClause,
          createdAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        },
      }),
      this.alertService.getAlertStats(merchantId),
    ]);

    // Calculate compliance score based on various factors
    const complianceScore = this.calculateComplianceScore({
      activeAudits,
      pendingRequests,
      withdrawnConsents,
      breachIncidents,
      alertStats,
    });

    return {
      totalMerchants,
      activeAudits,
      pendingRequests,
      withdrawnConsents,
      breachIncidents,
      complianceScore,
      alertCounts: {
        active: alertStats.active,
        critical: alertStats.bySeverity.critical,
        high: alertStats.bySeverity.high,
        medium: alertStats.bySeverity.medium,
        low: alertStats.bySeverity.low,
      },
    };
  }

  async performComplianceHealthCheck(
    merchantId: string,
  ): Promise<ComplianceHealthCheck> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found`);
    }

    const issues: ComplianceHealthCheck['issues'] = [];
    let overallScore = 100;

    // Check for recent audits
    const lastAudit = await this.auditRepository.findOne({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });

    const daysSinceLastAudit = lastAudit
      ? Math.floor(
          (Date.now() - lastAudit.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : Infinity;

    if (daysSinceLastAudit > 90) {
      issues.push({
        type: 'audit_overdue',
        severity: AlertSeverity.HIGH,
        description: 'Compliance audit is overdue',
        recommendation: 'Schedule and complete a compliance audit immediately',
      });
      overallScore -= 20;
    } else if (daysSinceLastAudit > 60) {
      issues.push({
        type: 'audit_due_soon',
        severity: AlertSeverity.MEDIUM,
        description: 'Compliance audit due soon',
        recommendation: 'Schedule a compliance audit within the next 30 days',
      });
      overallScore -= 10;
    }

    // Check for pending data subject requests
    const pendingDSRs = await this.dsrRepository.count({
      where: { merchantId, status: 'pending' },
    });

    if (pendingDSRs > 0) {
      const overdueCount = await this.dsrRepository.count({
        where: {
          merchantId,
          status: 'pending',
          createdAt: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        },
      });

      if (overdueCount > 0) {
        issues.push({
          type: 'overdue_dsr',
          severity: AlertSeverity.CRITICAL,
          description: `${overdueCount} data subject requests are overdue`,
          recommendation: 'Process overdue data subject requests immediately',
        });
        overallScore -= 30;
      } else if (pendingDSRs > 5) {
        issues.push({
          type: 'high_pending_dsr',
          severity: AlertSeverity.HIGH,
          description: `${pendingDSRs} pending data subject requests`,
          recommendation: 'Review and process pending requests',
        });
        overallScore -= 15;
      }
    }

    // Check for recent consent withdrawals
    const recentWithdrawals = await this.consentRepository.count({
      where: {
        merchantId,
        withdrawnAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      },
    });

    if (recentWithdrawals > 10) {
      issues.push({
        type: 'high_consent_withdrawals',
        severity: AlertSeverity.MEDIUM,
        description: `${recentWithdrawals} consent withdrawals in the last 30 days`,
        recommendation:
          'Review consent collection practices and user experience',
      });
      overallScore -= 15;
    }

    // Check for recent breach incidents
    const recentBreaches = await this.breachRepository.count({
      where: {
        merchantId,
        createdAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      },
    });

    if (recentBreaches > 0) {
      issues.push({
        type: 'recent_breaches',
        severity: AlertSeverity.CRITICAL,
        description: `${recentBreaches} breach incidents in the last 30 days`,
        recommendation:
          'Review breach response procedures and implement additional security measures',
      });
      overallScore -= 40;
    }

    // Ensure score doesn't go below 0
    overallScore = Math.max(0, overallScore);

    const nextAuditDue = lastAudit
      ? new Date(lastAudit.createdAt.getTime() + 90 * 24 * 60 * 60 * 1000)
      : new Date();

    return {
      merchantId,
      overallScore,
      issues,
      lastAuditDate: lastAudit?.createdAt,
      nextAuditDue,
    };
  }

  // Manual monitoring methods (can be called via API or scheduled externally)
  async monitorOverdueDataSubjectRequests(): Promise<void> {
    this.logger.log('Running overdue DSR monitoring...');

    try {
      // Find requests older than 30 days
      const overdueRequests = await this.dsrRepository.find({
        where: {
          status: 'pending',
          createdAt: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        },
        relations: ['merchant'],
      });

      for (const request of overdueRequests) {
        await this.alertService.createAlert({
          type: AlertType.COMPLIANCE_VIOLATION,
          severity: AlertSeverity.CRITICAL,
          title: 'Overdue Data Subject Request',
          description: `Data subject request ${request.id} is overdue (${request.requestType})`,
          merchantId: request.merchantId,
          metadata: {
            requestId: request.id,
            requestType: request.requestType,
            daysPending: Math.floor(
              (Date.now() - request.createdAt.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          },
        });
      }

      this.logger.log(
        `Created alerts for ${overdueRequests.length} overdue DSRs`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to monitor overdue DSRs',
        (error as Error).stack,
      );
    }
  }

  async performDailyHealthChecks(): Promise<void> {
    this.logger.log('Running daily health checks...');

    try {
      const merchants = await this.merchantRepository.find();

      for (const merchant of merchants) {
        const healthCheck = await this.performComplianceHealthCheck(
          merchant.id,
        );

        // Create alerts for critical issues
        for (const issue of healthCheck.issues) {
          if (issue.severity === AlertSeverity.CRITICAL) {
            await this.alertService.createAlert({
              type: AlertType.COMPLIANCE_VIOLATION,
              severity: issue.severity,
              title: `Compliance Issue: ${issue.type}`,
              description: issue.description,
              merchantId: merchant.id,
              metadata: {
                healthCheckScore: healthCheck.overallScore,
                recommendation: issue.recommendation,
              },
            });
          }
        }
      }

      this.logger.log(
        `Completed health checks for ${merchants.length} merchants`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to perform daily health checks',
        (error as Error).stack,
      );
    }
  }

  async cleanupExpiredAlerts(): Promise<void> {
    this.logger.log('Running alert cleanup...');

    try {
      const cleanedCount = await this.alertService.cleanupExpiredAlerts();
      this.logger.log(`Cleaned up ${cleanedCount} expired alerts`);
    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired alerts',
        (error as Error).stack,
      );
    }
  }

  private calculateComplianceScore(metrics: {
    activeAudits: number;
    pendingRequests: number;
    withdrawnConsents: number;
    breachIncidents: number;
    alertStats: {
      bySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    };
  }): number {
    let score = 100;

    // Deduct points for various issues
    score -= metrics.pendingRequests * 2; // 2 points per pending request
    score -= metrics.withdrawnConsents * 1; // 1 point per withdrawn consent
    score -= metrics.breachIncidents * 10; // 10 points per breach incident
    score -= metrics.alertStats.bySeverity.critical * 15; // 15 points per critical alert
    score -= metrics.alertStats.bySeverity.high * 10; // 10 points per high alert
    score -= metrics.alertStats.bySeverity.medium * 5; // 5 points per medium alert
    score -= metrics.alertStats.bySeverity.low * 1; // 1 point per low alert

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
}
