import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScopeWizard from '../components/phases/ScopeWizard';
import { initialState } from '../hooks/useAssessment';

function renderWizard(overrides = {}) {
  const dispatch = vi.fn();
  const onComplete = vi.fn();
  const assessmentState = { ...initialState, ...overrides };
  render(<ScopeWizard assessmentState={assessmentState} dispatch={dispatch} onComplete={onComplete} />);
  return { dispatch, onComplete };
}

describe('ScopeWizard', () => {
  it('renders timeline, mode, role, nexus, and domain sections', () => {
    renderWizard();
    expect(screen.getByTestId('scope-wizard')).toBeInTheDocument();
    expect(screen.getByText('EU AI Act — Phased Applicability')).toBeInTheDocument();
    expect(screen.getByText('Assessment Mode')).toBeInTheDocument();
    expect(screen.getByText(/Operator Role/)).toBeInTheDocument();
    expect(screen.getByText(/EU Nexus/)).toBeInTheDocument();
    expect(screen.getByText(/Risk Domain Flags/)).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('scope-wizard-submit'));
    expect(screen.getByText('Select your role under the AI Act')).toBeInTheDocument();
    expect(screen.getByText('Select an assessment mode')).toBeInTheDocument();
    expect(screen.getByText(/At least one EU nexus condition/)).toBeInTheDocument();
  });

  it('dispatches SET_SCOPE, SET_MODE, SET_SYSTEM_FACTS on valid submit and calls onComplete', () => {
    const { dispatch, onComplete } = renderWizard();

    fireEvent.click(screen.getByText(/Deployer/));
    fireEvent.click(screen.getByText('Founder Mode'));
    fireEvent.click(screen.getByText('AI system is placed on the EU market'));
    fireEvent.click(screen.getByText(/Credit scoring/));

    fireEvent.click(screen.getByTestId('scope-wizard-submit'));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SCOPE' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_MODE', payload: 'founder' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SYSTEM_FACTS' }));
    expect(onComplete).toHaveBeenCalled();
  });

  it('renders three mode options', () => {
    renderWizard();
    expect(screen.getByText('Founder Mode')).toBeInTheDocument();
    expect(screen.getByText('Regulator Mode')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Mode')).toBeInTheDocument();
  });

  it('loads existing scope values from state', () => {
    renderWizard({
      scope: {
        operatorRole: 'provider',
        gpaiRole: 'none',
        euNexus: { placedOnEUMarket: true, usedInEU: false, outputAffectsEUPersons: false },
        riskDomainFlags: [],
        completed: false,
      },
      meta: { ...initialState.meta, mode: 'regulator' },
    });
    const providerRadio = screen.getByDisplayValue('provider');
    expect(providerRadio.checked).toBe(true);
    const regulatorRadio = screen.getByDisplayValue('regulator');
    expect(regulatorRadio.checked).toBe(true);
  });
});
