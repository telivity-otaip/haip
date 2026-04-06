import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RatePlanService } from './rate-plan.service';

@ApiTags('rate-plans')
@Controller('rate-plans')
export class RatePlanController {
  constructor(private readonly ratePlanService: RatePlanService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rate plans' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllRatePlans() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rate plan by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getRatePlanById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post()
  @ApiOperation({ summary: 'Create new rate plan' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createRatePlan(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rate plan' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  updateRatePlan(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }
}
