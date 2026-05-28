import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ example: 'Новый заказ #123 создан' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ example: 'HTML', enum: ['HTML', 'Markdown', 'MarkdownV2'] })
  @IsOptional()
  @IsString()
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';

  @ApiPropertyOptional({ example: { channel: 'orders' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SendNotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ example: 'sent' })
  status!: string;

  @ApiProperty()
  sentAt!: string;
}
