import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, QueryError, EmptyState } from './ErrorBoundary';
import { AlertTriangle } from 'lucide-react';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console.error
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Working content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  spy.mockRestore();
});

describe('QueryError', () => {
  it('renders error message with retry button', () => {
    const onRetry = vi.fn();
    render(<QueryError onRetry={onRetry} />);
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', async () => {
    const onRetry = vi.fn();
    render(<QueryError onRetry={onRetry} />);
    await userEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="No arrivals today" />);
    expect(screen.getByText('No arrivals today')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState icon={AlertTriangle} message="Empty" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
