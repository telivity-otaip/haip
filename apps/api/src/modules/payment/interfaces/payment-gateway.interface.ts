export interface PaymentGatewayResult {
  success: boolean;
  transactionId: string;
  errorMessage?: string;
}

export interface PaymentGateway {
  authorize(token: string, amount: number, currency: string): Promise<PaymentGatewayResult>;
  capture(transactionId: string, amount?: number): Promise<PaymentGatewayResult>;
  void(transactionId: string): Promise<PaymentGatewayResult>;
  refund(transactionId: string, amount?: number): Promise<PaymentGatewayResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
