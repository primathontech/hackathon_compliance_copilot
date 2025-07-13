import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DataSubjectRightsService,
  CreateDataSubjectRequestDto,
  UpdateRequestStatusDto,
} from './data-subject-rights.service';

@Controller('data-subject-rights')
@UseGuards(JwtAuthGuard)
export class DataSubjectRightsController {
  constructor(
    private readonly dataSubjectRightsService: DataSubjectRightsService,
  ) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() createDto: CreateDataSubjectRequestDto) {
    return this.dataSubjectRightsService.createRequest(createDto);
  }

  @Get('requests')
  async getRequestsByMerchant(@Query('merchantId') merchantId: string) {
    return this.dataSubjectRightsService.getRequestsByMerchant(merchantId);
  }

  @Get('requests/:requestId')
  async getRequestById(@Param('requestId') requestId: string) {
    return this.dataSubjectRightsService.getRequestById(requestId);
  }

  @Put('requests/:requestId/status')
  async updateRequestStatus(
    @Param('requestId') requestId: string,
    @Body() updateDto: UpdateRequestStatusDto,
  ) {
    return this.dataSubjectRightsService.updateRequestStatus(
      requestId,
      updateDto,
    );
  }

  @Post('requests/:requestId/process-access')
  async processAccessRequest(@Param('requestId') requestId: string) {
    return this.dataSubjectRightsService.processAccessRequest(requestId);
  }

  @Post('requests/:requestId/process-erasure')
  @HttpCode(HttpStatus.NO_CONTENT)
  async processErasureRequest(@Param('requestId') requestId: string) {
    await this.dataSubjectRightsService.processErasureRequest(requestId);
  }

  @Post('requests/:requestId/process-portability')
  async processPortabilityRequest(
    @Param('requestId') requestId: string,
    @Res() res: Response,
  ) {
    const dataBuffer =
      await this.dataSubjectRightsService.processPortabilityRequest(requestId);

    const request =
      await this.dataSubjectRightsService.getRequestById(requestId);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="data-export-${request.customerEmail}-${new Date().toISOString().split('T')[0]}.json"`,
      'Content-Length': dataBuffer.length.toString(),
    });

    res.send(dataBuffer);
  }

  @Get('statistics')
  async getRequestStatistics(@Query('merchantId') merchantId: string) {
    return this.dataSubjectRightsService.getRequestStatistics(merchantId);
  }
}
