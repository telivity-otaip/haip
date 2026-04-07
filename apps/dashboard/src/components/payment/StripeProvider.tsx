import { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

/**
 * StripeProvider wraps children with Stripe Elements context.
 *
 * Loads Stripe.js with the publishable key from environment variables.
 * Card data never touches HAIP servers — Stripe.js handles all card input
 * client-side. Only the PaymentMethod ID (pm_xxx) is sent to the HAIP API.
 *
 * PCI DSS: This pattern keeps HAIP out of PCI scope entirely.
 */

interface StripeProviderProps {
  children: React.ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  if (!stripePromise) {
    // Stripe not configured — render children without Elements wrapper
    // This allows the app to work in mock mode without Stripe keys
    return <>{children}</>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0f172a',
            borderRadius: '6px',
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
