import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function ToastTrigger({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const { toast } = useToast();
  return <button onClick={() => toast(type, message)}>Show Toast</button>;
}

describe('Toast', () => {
  it('shows success toast when triggered', async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Check-in successful" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Check-in successful')).toBeInTheDocument();
  });

  it('shows error toast when triggered', async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="error" message="Failed to save" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Failed to save')).toBeInTheDocument();
  });

  it('dismisses toast when X clicked', async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="info" message="Processing..." />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
  });

  it('auto-dismisses after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Auto dismiss" />
      </ToastProvider>,
    );
    await user.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
