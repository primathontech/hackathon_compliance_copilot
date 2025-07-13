import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Merchant } from '../../entities/merchant.entity';

interface RequestWithUser {
  user: Merchant;
}

export const CurrentMerchant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Merchant => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
