import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Process payment' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  processPayment(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getPaymentById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }
}
