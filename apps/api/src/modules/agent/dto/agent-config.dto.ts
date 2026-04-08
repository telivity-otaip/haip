import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';

export class UpdateAgentConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['manual', 'suggest', 'autopilot'] })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Confidence threshold for autopilot (0.0–1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  autopilotConfidenceThreshold?: number;

  @ApiPropertyOptional({ description: 'Agent-specific configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
