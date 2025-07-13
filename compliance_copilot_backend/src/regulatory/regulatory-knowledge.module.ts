import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegulatoryRule } from './regulatory-knowledge.entity';
import { RegulatoryKnowledgeService } from './regulatory-knowledge.service';
import { RegulatoryKnowledgeController } from './regulatory-knowledge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RegulatoryRule])],
  controllers: [RegulatoryKnowledgeController],
  providers: [RegulatoryKnowledgeService],
  exports: [RegulatoryKnowledgeService],
})
export class RegulatoryKnowledgeModule {}
