import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhaseNav from '../components/shared/PhaseNav';

const PHASES = [
  { id: 'registration', label: 'System Registration', order: 1 },
  { id: 'classification', label: 'Risk Classification', order: 2 },
  { id: 'assessment', label: 'Obligation Assessment', order: 3 },
  { id: 'synthesis', label: 'Gap Synthesis', order: 4 },
];

describe('PhaseNav', () => {
  it('renders all phase step buttons', () => {
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="registration"
        unlockedPhases={new Set(['registration'])}
        onPhaseSelect={() => {}}
      />,
    );

    for (const p of PHASES) {
      expect(screen.getByTestId(`phase-step-${p.id}`)).toBeInTheDocument();
    }
  });

  it('marks the active phase with aria-current="step"', () => {
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="classification"
        unlockedPhases={new Set(['registration', 'classification'])}
        onPhaseSelect={() => {}}
      />,
    );

    expect(screen.getByTestId('phase-step-classification')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('phase-step-registration')).not.toHaveAttribute('aria-current');
  });

  it('calls onPhaseSelect when an unlocked phase is clicked', () => {
    const onPhaseSelect = vi.fn();
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="registration"
        unlockedPhases={new Set(['registration', 'classification'])}
        onPhaseSelect={onPhaseSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('phase-step-classification'));
    expect(onPhaseSelect).toHaveBeenCalledWith('classification');
  });

  it('shows a tooltip when a locked phase is clicked', () => {
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="registration"
        unlockedPhases={new Set(['registration'])}
        onPhaseSelect={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId('phase-step-classification'));
    expect(screen.getByTestId('phase-tooltip-classification')).toBeInTheDocument();
    expect(screen.getByTestId('phase-tooltip-classification')).toHaveTextContent(
      'Complete System Registration to unlock',
    );
  });

  it('does NOT call onPhaseSelect when a locked phase is clicked', () => {
    const onPhaseSelect = vi.fn();
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="registration"
        unlockedPhases={new Set(['registration'])}
        onPhaseSelect={onPhaseSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('phase-step-assessment'));
    expect(onPhaseSelect).not.toHaveBeenCalled();
  });

  it('displays a checkmark for completed phases', () => {
    render(
      <PhaseNav
        phases={PHASES}
        currentPhase="assessment"
        unlockedPhases={new Set(['registration', 'classification', 'assessment'])}
        onPhaseSelect={() => {}}
      />,
    );

    expect(screen.getByTestId('phase-step-registration')).toHaveTextContent('✓');
  });
});
