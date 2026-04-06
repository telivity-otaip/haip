import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PaymentGateway, PaymentGatewayResult } from './interfaces/payment-gateway.interface';

@Injectable()
export class MockGateway implements PaymentGateway {
  async authorize(_token: string, _amount: number, _currency: string): Promise<PaymentGatewayResult> {
    return { success: true, transactionId: `mock-auth-${randomUUID()}` };
  }

  async capture(_transactionId: string, _amount?: number): Promise<PaymentGatewayResult> {
    return { success: true, transactionId: `mock-cap-${randomUUID()}` };
  }

  async void(_transactionId: string): Promise<PaymentGatewayResult> {
    return { success: true, transactionId: `mock-void-${randomUUID()}` };
  }

  async refund(_transactionId: string, _amount?: number): Promise<PaymentGatewayResult> {
    return { success: true, transactionId: `mock-ref-${randomUUID()}` };
  }
}
