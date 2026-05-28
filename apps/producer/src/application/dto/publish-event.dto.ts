import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PublishEventDto {
  @ApiProperty({ example: 'order.created', description: 'Тип события' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    example: { orderId: '123', amount: 99.99 },
    description: 'Полезная нагрузка события',
  })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Ключ идемпотентности (UUID). Если не указан — будет сгенерирован автоматически',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PublishEventResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'order.created' })
  type!: string;

  @ApiProperty({ example: 'published' })
  status!: string;

  @ApiProperty({ example: '2026-05-28T12:00:00.000Z' })
  publishedAt!: string;
}
