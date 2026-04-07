/**
 * PaymentStatusBadge — displays Stripe payment status with color coding.
 */

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  authorized: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Authorized' },
  captured: { bg: 'bg-green-100', text: 'text-green-800', label: 'Captured' },
  settled: { bg: 'bg-green-100', text: 'text-green-800', label: 'Settled' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  voided: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Voided' },
  refunded: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Refunded' },
  partially_refunded: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Partial Refund' },
};

interface PaymentStatusBadgeProps {
  status: string;
  gatewayProvider?: string;
}

export function PaymentStatusBadge({ status, gatewayProvider }: PaymentStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: status,
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
      {gatewayProvider && (
        <span className="text-xs text-gray-400">
          via {gatewayProvider}
        </span>
      )}
    </span>
  );
}
