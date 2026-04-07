import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonPage } from './Skeleton';

describe('Skeleton', () => {
  it('renders a skeleton element with animation', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-skeleton');
    expect(el.className).toContain('h-4');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SkeletonCard', () => {
  it('renders card skeleton with 3 skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(3);
  });
});

describe('SkeletonTable', () => {
  it('renders skeleton table with default 5 rows and 4 cols', () => {
    const { container } = render(<SkeletonTable />);
    // Header row (4 skeletons) + 5 data rows (4 each) = 24 total
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(24);
  });

  it('accepts custom row and column count', () => {
    const { container } = render(<SkeletonTable rows={2} cols={3} />);
    // Header (3) + 2 rows (3 each) = 9
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(9);
  });
});

describe('SkeletonPage', () => {
  it('renders full page skeleton with cards and table', () => {
    const { container } = render(<SkeletonPage />);
    // Should have many skeleton elements
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(10);
  });
});
