import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsISO31661Alpha2, IsNotEmpty, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

export class ShipToDto {
  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsISO31661Alpha2()
  country: string;
}

export class CreateOrderDto {
  @Matches(/^SKU-[A-Z0-9]+$/)
  sku: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => ShipToDto)
  shipTo: ShipToDto;
}
