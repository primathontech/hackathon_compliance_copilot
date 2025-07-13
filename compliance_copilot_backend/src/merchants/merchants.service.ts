import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../entities/merchant.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${id} not found`);
    }

    return merchant;
  }

  async findByShopDomain(shopDomain: string): Promise<Merchant | null> {
    return this.merchantRepository.findOne({
      where: { shopDomain },
    });
  }

  async updateComplianceScore(
    merchantId: string,
    score: number,
  ): Promise<void> {
    await this.merchantRepository.update(merchantId, {
      complianceScore: score,
    });
  }

  async create(merchantData: Partial<Merchant>): Promise<Merchant> {
    const merchant = this.merchantRepository.create(merchantData);
    return this.merchantRepository.save(merchant);
  }

  async update(id: string, updateData: Partial<Merchant>): Promise<Merchant> {
    await this.merchantRepository.update(id, updateData);
    return this.findById(id);
  }

  async findAll(): Promise<Merchant[]> {
    return this.merchantRepository.find();
  }

  async getActiveCount(): Promise<number> {
    return this.merchantRepository.count({
      where: { complianceStatus: 'compliant' },
    });
  }

  async getAverageComplianceScore(): Promise<number> {
    const result = await this.merchantRepository
      .createQueryBuilder('merchant')
      .select('AVG(merchant.complianceScore)', 'average')
      .getRawOne();

    return parseFloat(result.average) || 0;
  }
}
