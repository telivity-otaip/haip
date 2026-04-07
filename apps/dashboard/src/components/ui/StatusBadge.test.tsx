import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders formatted label from status', () => {
    render(<StatusBadge status="checked_in" />);
    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="warning" label="Priority 8" />);
    expect(screen.getByText('Priority 8')).toBeInTheDocument();
  });

  it('applies confirmed status color (dark-teal)', () => {
    render(<StatusBadge status="confirmed" />);
    const badge = screen.getByText('Confirmed');
    expect(badge.className).toContain('bg-telivity-dark-teal');
    expect(badge.className).toContain('text-white');
  });

  it('applies pending status color (orange)', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText('Pending');
    expect(badge.className).toContain('bg-telivity-orange');
  });

  it('applies fallback color for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    const badge = screen.getByText('Unknown Status');
    expect(badge.className).toContain('bg-telivity-mid-grey');
  });

  it('applies custom className', () => {
    render(<StatusBadge status="confirmed" className="ml-2" />);
    expect(screen.getByText('Confirmed').className).toContain('ml-2');
  });
});
