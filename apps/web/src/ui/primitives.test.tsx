import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Count } from './Count';
import { KeyValue } from './KeyValue';
import { MoneyText } from './MoneyText';
import { parsePence } from './MoneyInput';
import { ProgressBar } from './ProgressBar';
import { StatusChip } from './StatusChip';

describe('parsePence', () => {
  it.each([
    ['420', 42000],
    ['£420', 42000],
    ['420.00', 42000],
    ['1,249.5', 124950],
    [' £0.07 ', 7],
  ])('%s → %i pence', (input, pence) => expect(parsePence(input)).toBe(pence));

  it.each(['', 'abc', '4.205', '-3', '£'])('rejects %j', (input) => expect(parsePence(input)).toBeNull());
});

describe('StatusChip', () => {
  it('always shows a text label, not only colour', () => {
    render(<StatusChip status="needs_info" />);
    expect(screen.getByText('Needs info')).toBeInTheDocument();
  });

  it('maps outcomes that are not case statuses', () => {
    render(<StatusChip status="declined" />);
    expect(screen.getByText('Declined').className).toContain('s-blocked');
  });
});

describe('Count', () => {
  it('is hidden at zero and caps at max', () => {
    const { container, rerender } = render(<Count value={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Count value={250} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('exposes progress to assistive tech', () => {
    render(<ProgressBar value={3} max={12} label="Cases finished" />);
    const bar = screen.getByRole('progressbar', { name: 'Cases finished' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '12');
  });
});

describe('MoneyText', () => {
  it('formats integer pence in GBP with a real minus sign', () => {
    render(<MoneyText pence={-124900} />);
    expect(screen.getByText('−£1,249.00')).toBeInTheDocument();
  });
});

describe('KeyValue', () => {
  it('renders a description list', () => {
    render(<KeyValue items={[{ label: 'Ref', value: 'X-1', mono: true }]} />);
    expect(screen.getByText('Ref').tagName).toBe('DT');
    expect(screen.getByText('X-1').tagName).toBe('DD');
  });
});
