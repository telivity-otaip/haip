import { useState, useCallback } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

/**
 * CardInput component using Stripe Elements.
 *
 * Renders a secure card input field powered by Stripe.js.
 * On submit, creates a PaymentMethod and returns the pm_xxx ID.
 * Card data NEVER touches HAIP servers (PCI DSS compliant).
 *
 * Usage:
 * ```tsx
 * <StripeProvider>
 *   <CardInput
 *     onPaymentMethod={(pm) => console.log(pm.id, pm.card?.last4)}
 *     onError={(err) => console.error(err)}
 *   />
 * </StripeProvider>
 * ```
 */

interface CardInputProps {
  onPaymentMethod: (paymentMethod: {
    id: string;
    card?: { last4: string; brand: string };
  }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  submitLabel?: string;
}

export function CardInput({
  onPaymentMethod,
  onError,
  disabled = false,
  submitLabel = 'Save Card',
}: CardInputProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!stripe || !elements) {
        // Stripe.js not loaded yet
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      setLoading(true);
      setCardError(null);

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      setLoading(false);

      if (error) {
        const message = error.message ?? 'Card validation failed';
        setCardError(message);
        onError?.(message);
        return;
      }

      if (paymentMethod) {
        onPaymentMethod({
          id: paymentMethod.id,
          card: paymentMethod.card
            ? {
                last4: paymentMethod.card.last4 ?? '',
                brand: paymentMethod.card.brand ?? '',
              }
            : undefined,
        });
      }
    },
    [stripe, elements, onPaymentMethod, onError],
  );

  // If Stripe is not available (mock mode), show a placeholder
  if (!stripe) {
    return (
      <div className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        Card input unavailable — Stripe not configured (STRIPE_MODE=mock)
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md border border-gray-300 p-3">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#0f172a',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: { color: '#ef4444' },
            },
            hidePostalCode: true,
          }}
        />
      </div>

      {cardError && (
        <p className="text-sm text-red-600">{cardError}</p>
      )}

      <button
        type="submit"
        disabled={disabled || loading || !stripe}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Processing...' : submitLabel}
      </button>
    </form>
  );
}
