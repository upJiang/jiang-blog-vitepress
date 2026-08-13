import { Type } from 'class-transformer'
import { IsArray, IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator'

export class OrderItemDto {
  @IsUUID() productId!: string
  @IsInt() @Min(1) @Max(999) quantity!: number
}

export class CreateOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items!: OrderItemDto[]
}

export class PaymentCallbackDto {
  @IsString() @MaxLength(80) provider!: string
  @IsString() @MaxLength(190) providerEventId!: string
  @IsUUID() orderId!: string
  @IsIn(['paid']) status!: 'paid'
}
