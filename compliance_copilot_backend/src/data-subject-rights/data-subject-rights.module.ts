import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSubjectRightsController } from './data-subject-rights.controller';
import { DataSubjectRightsService } from './data-subject-rights.service';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { Merchant } from '../entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DataSubjectRequest, Merchant])],
  controllers: [DataSubjectRightsController],
  providers: [DataSubjectRightsService],
  exports: [DataSubjectRightsService],
})
export class DataSubjectRightsModule {}
