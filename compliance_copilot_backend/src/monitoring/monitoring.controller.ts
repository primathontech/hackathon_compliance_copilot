import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitoringService } from './monitoring.service';
import {
  AlertService,
  CreateAlertDto,
  UpdateAlertDto,
  AlertFilters,
} from './alert.service';

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly alertService: AlertService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Query('merchantId') merchantId?: string) {
    try {
      const metrics =
        await this.monitoringService.getMonitoringMetrics(merchantId);
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch monitoring dashboard',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check/:merchantId')
  async getHealthCheck(@Param('merchantId') merchantId: string) {
    try {
      const healthCheck =
        await this.monitoringService.performComplianceHealthCheck(merchantId);
      return {
        success: true,
        data: healthCheck,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to perform health check',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts')
  async getAlerts(
    @Query('merchantId') merchantId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    try {
      const filters: AlertFilters = {
        merchantId,
        type: type as any,
        severity: severity as any,
        status: status as any,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      };

      const alerts = await this.alertService.getAlerts(filters);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch alerts',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts/active')
  async getActiveAlerts(@Query('merchantId') merchantId?: string) {
    try {
      const alerts = await this.alertService.getActiveAlerts(merchantId);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch active alerts',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts/stats')
  async getAlertStats(@Query('merchantId') merchantId?: string) {
    try {
      const stats = await this.alertService.getAlertStats(merchantId);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch alert statistics',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts/:id')
  async getAlert(@Param('id') id: string) {
    try {
      const alert = await this.alertService.getAlertById(id);
      return {
        success: true,
        data: alert,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch alert',
          error: (error as Error).message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('alerts')
  async createAlert(@Body() createAlertDto: CreateAlertDto) {
    try {
      const alert = await this.alertService.createAlert(createAlertDto);
      return {
        success: true,
        data: alert,
        message: 'Alert created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create alert',
          error: (error as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('alerts/:id')
  async updateAlert(
    @Param('id') id: string,
    @Body() updateAlertDto: UpdateAlertDto,
  ) {
    try {
      const alert = await this.alertService.updateAlert(id, updateAlertDto);
      return {
        success: true,
        data: alert,
        message: 'Alert updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update alert',
          error: (error as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body('acknowledgedBy') acknowledgedBy: string,
  ) {
    try {
      const alert = await this.alertService.acknowledgeAlert(
        id,
        acknowledgedBy,
      );
      return {
        success: true,
        data: alert,
        message: 'Alert acknowledged successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to acknowledge alert',
          error: (error as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('alerts/:id/resolve')
  async resolveAlert(
    @Param('id') id: string,
    @Body() body: { resolvedBy: string; resolutionNotes?: string },
  ) {
    try {
      const alert = await this.alertService.resolveAlert(
        id,
        body.resolvedBy,
        body.resolutionNotes,
      );
      return {
        success: true,
        data: alert,
        message: 'Alert resolved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to resolve alert',
          error: (error as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('alerts/:id/dismiss')
  async dismissAlert(@Param('id') id: string) {
    try {
      const alert = await this.alertService.dismissAlert(id);
      return {
        success: true,
        data: alert,
        message: 'Alert dismissed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to dismiss alert',
          error: (error as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('metrics')
  async getMetrics(@Query('merchantId') merchantId?: string) {
    try {
      const metrics =
        await this.monitoringService.getMonitoringMetrics(merchantId);
      return {
        success: true,
        data: {
          complianceScore: metrics.complianceScore,
          totalMerchants: metrics.totalMerchants,
          activeAudits: metrics.activeAudits,
          pendingRequests: metrics.pendingRequests,
          withdrawnConsents: metrics.withdrawnConsents,
          breachIncidents: metrics.breachIncidents,
          alertCounts: metrics.alertCounts,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch metrics',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Manual monitoring triggers
  @Post('monitor/dsr')
  async monitorOverdueRequests() {
    try {
      await this.monitoringService.monitorOverdueDataSubjectRequests();
      return {
        success: true,
        message: 'Overdue DSR monitoring completed',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to monitor overdue requests',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('monitor/health-checks')
  async performHealthChecks() {
    try {
      await this.monitoringService.performDailyHealthChecks();
      return {
        success: true,
        message: 'Health checks completed',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to perform health checks',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup/alerts')
  async cleanupAlerts() {
    try {
      await this.monitoringService.cleanupExpiredAlerts();
      return {
        success: true,
        message: 'Alert cleanup completed',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to cleanup alerts',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
