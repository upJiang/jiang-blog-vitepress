import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { CurrentPrincipal } from '../auth/current-principal'
import type { Principal } from '../auth/auth.types'
import { CommerceService } from './commerce.service'
import { CreateOrderDto, PaymentCallbackDto } from './commerce.dto'

@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('products')
  @UseGuards(AccessTokenGuard)
  products(@CurrentPrincipal() principal: Principal) { return this.commerce.products(principal) }

  @Post('orders')
  @UseGuards(AccessTokenGuard)
  createOrder(
    @CurrentPrincipal() principal: Principal,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() input: CreateOrderDto,
  ) { return this.commerce.createOrder(principal, idempotencyKey, input) }

  @Post('payments/callback')
  @HttpCode(204)
  payment(@Headers('x-signature') signature: string | undefined, @Body() input: PaymentCallbackDto) {
    return this.commerce.paymentCallback(signature, input)
  }
}
