import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Percent } from 'lucide-react';
import KpiCard from './KpiCard';

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Occupancy" value="72.5%" icon={Percent} />);
    expect(screen.getByText('Occupancy')).toBeInTheDocument();
    expect(screen.getByText('72.5%')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<KpiCard title="ADR" value="$189" subtitle="Average Daily Rate" icon={Percent} />);
    expect(screen.getByText('Average Daily Rate')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(<KpiCard title="RevPAR" value="$134" icon={Percent} trend={{ value: 5.2, label: 'vs last week' }} />);
    expect(screen.getByText('+5.2% vs last week')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(<KpiCard title="Revenue" value="$12k" icon={Percent} trend={{ value: -3.1, label: 'vs yesterday' }} />);
    expect(screen.getByText('-3.1% vs yesterday')).toBeInTheDocument();
  });
});
