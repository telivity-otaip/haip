import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WebhookService } from '../webhook/webhook.service';
import { FolioService } from '../folio/folio.service';
import { DRIZZLE } from '../../database/database.module';

const mockPayment = {
  id: 'pay-001',
  propertyId: 'prop-001',
  folioId: 'folio-001',
  status: 'authorized',
  amount: '500.00',
  gatewayTransactionId: 'pi_test_123',
};

function createMockDb(returnData: any[] = [mockPayment]) {
  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (resolve: any) => resolve(returnData),
        }),
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(returnData),
        }),
      }),
    }),
  };
}

const mockWebhookService = { emit: vi.fn() };
const mockFolioService = { recalculateBalance: vi.fn().mockResolvedValue(undefined) };
const mockConfigService = {
  get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
    if (key === 'STRIPE_MODE') return 'mock';
    if (key === 'STRIPE_SECRET_KEY') return null;
    if (key === 'STRIPE_WEBHOOK_SECRET') return null;
    return defaultValue;
  }),
};

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WebhookService, useValue: mockWebhookService },
        { provide: FolioService, useValue: mockFolioService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
  });

  describe('handleWebhook (mock mode)', () => {
    it('should return 200 with mode: mock when STRIPE_MODE=mock', async () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      await controller.handleWebhook({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ received: true, mode: 'mock' });
    });
  });

  describe('internal handlers', () => {
    it('should update payment to captured on payment_intent.succeeded', async () => {
      const handler = (controller as any).handlePaymentIntentSucceeded.bind(controller);
      await handler({ id: 'pi_test_123' });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockWebhookService.emit).toHaveBeenCalledWith(
        'payment.received',
        'payment',
        'pay-001',
        expect.objectContaining({ status: 'captured' }),
        'prop-001',
      );
    });

    it('should skip if payment already captured', async () => {
      const capturedDb = createMockDb([{ ...mockPayment, status: 'captured' }]);
      const module = await Test.createTestingModule({
        controllers: [StripeWebhookController],
        providers: [
          { provide: DRIZZLE, useValue: capturedDb },
          { provide: WebhookService, useValue: mockWebhookService },
          { provide: FolioService, useValue: mockFolioService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const ctrl = module.get<StripeWebhookController>(StripeWebhookController);

      await (ctrl as any).handlePaymentIntentSucceeded({ id: 'pi_test_123' });

      expect(capturedDb.update).not.toHaveBeenCalled();
    });

    it('should update payment to failed on payment_intent.payment_failed', async () => {
      const handler = (controller as any).handlePaymentIntentFailed.bind(controller);
      await handler({
        id: 'pi_test_123',
        last_payment_error: { message: 'Card declined' },
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockWebhookService.emit).toHaveBeenCalledWith(
        'payment.failed',
        'payment',
        'pay-001',
        expect.objectContaining({ error: 'Card declined' }),
        'prop-001',
      );
    });

    it('should update payment to voided on payment_intent.canceled', async () => {
      const handler = (controller as any).handlePaymentIntentCanceled.bind(controller);
      await handler({ id: 'pi_test_123' });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockWebhookService.emit).toHaveBeenCalledWith(
        'payment.failed',
        'payment',
        'pay-001',
        expect.objectContaining({ status: 'voided' }),
        'prop-001',
      );
    });

    it('should update payment to refunded on charge.refunded (full)', async () => {
      const capturedDb = createMockDb([{ ...mockPayment, status: 'captured' }]);
      const module = await Test.createTestingModule({
        controllers: [StripeWebhookController],
        providers: [
          { provide: DRIZZLE, useValue: capturedDb },
          { provide: WebhookService, useValue: mockWebhookService },
          { provide: FolioService, useValue: mockFolioService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const ctrl = module.get<StripeWebhookController>(StripeWebhookController);

      await (ctrl as any).handleChargeRefunded({
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
        amount: 50000,
        amount_refunded: 50000, // full refund
      });

      expect(capturedDb.update).toHaveBeenCalled();
      expect(mockWebhookService.emit).toHaveBeenCalledWith(
        'payment.refunded',
        'payment',
        'pay-001',
        expect.objectContaining({ status: 'refunded' }),
        'prop-001',
      );
    });

    it('should update to partially_refunded for partial refund', async () => {
      const capturedDb = createMockDb([{ ...mockPayment, status: 'captured' }]);
      const module = await Test.createTestingModule({
        controllers: [StripeWebhookController],
        providers: [
          { provide: DRIZZLE, useValue: capturedDb },
          { provide: WebhookService, useValue: mockWebhookService },
          { provide: FolioService, useValue: mockFolioService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const ctrl = module.get<StripeWebhookController>(StripeWebhookController);

      await (ctrl as any).handleChargeRefunded({
        id: 'ch_test_123',
        payment_intent: 'pi_test_123',
        amount: 50000,
        amount_refunded: 25000, // partial refund
      });

      expect(mockWebhookService.emit).toHaveBeenCalledWith(
        'payment.refunded',
        'payment',
        'pay-001',
        expect.objectContaining({ status: 'partially_refunded' }),
        'prop-001',
      );
    });

    it('should not update if payment not found', async () => {
      const emptyDb = createMockDb([]);
      const module = await Test.createTestingModule({
        controllers: [StripeWebhookController],
        providers: [
          { provide: DRIZZLE, useValue: emptyDb },
          { provide: WebhookService, useValue: mockWebhookService },
          { provide: FolioService, useValue: mockFolioService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const ctrl = module.get<StripeWebhookController>(StripeWebhookController);

      await (ctrl as any).handlePaymentIntentSucceeded({ id: 'pi_unknown' });

      expect(emptyDb.update).not.toHaveBeenCalled();
    });
  });
});
