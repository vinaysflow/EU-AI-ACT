import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RiskClassification from '../components/phases/RiskClassification';
import { initialState } from '../hooks/useAssessment';

function renderClassification(stateOverrides = {}) {
  const dispatch = vi.fn();
  const assessmentState = {
    ...initialState,
    system: {
      ...initialState.system,
      name: 'Test System',
      systemType: 'ml_statistical',
      ...stateOverrides.system,
    },
    classification: {
      ...initialState.classification,
      ...stateOverrides.classification,
    },
    ...stateOverrides,
  };
  render(<RiskClassification assessmentState={assessmentState} dispatch={dispatch} />);
  return { dispatch };
}

describe('RiskClassification', () => {
  it('renders Step 1 (Art. 5 screening) by default', () => {
    renderClassification();
    expect(
      screen.getByText('Step 1 — Article 5: Prohibited Practice Screening'),
    ).toBeInTheDocument();
  });

  it('disables Proceed until all Art. 5 toggles are answered', () => {
    renderClassification();
    const proceed = screen.getByTestId('classify-step1-proceed');
    expect(proceed).toBeDisabled();
  });

  it('enables Proceed after all toggles are set to NO', () => {
    renderClassification();

    const noButtons = screen.getAllByText('NO');
    for (const btn of noButtons) {
      fireEvent.click(btn);
    }

    expect(screen.getByTestId('classify-step1-proceed')).toBeEnabled();
  });

  it('shows prohibited warning when a YES toggle is selected', () => {
    renderClassification();

    const yesButtons = screen.getAllByText('YES');
    fireEvent.click(yesButtons[0]);

    expect(
      screen.getByText(/One or more prohibited practices have been flagged/),
    ).toBeInTheDocument();
  });

  it('renders the classification result card when result is in state', () => {
    renderClassification({
      classification: {
        rulesEngineResult: {
          finalClassification: 'HIGH_RISK',
          step1_prohibition: { isProhibited: false, matchedProvisions: [], flags: [] },
          step2_definition: { possiblyExcluded: false, reason: null },
          step3_annexIII: { anyMatch: true, matchedDomains: ['5b_credit'], matchDetails: {} },
          step4_derogation: { profilingDetected: false, derogationPossible: false, flags: [] },
          step5_role: { primaryRole: 'DEPLOYER', providerRisk: false, flags: [] },
          requiresLegalReview: false,
          flags: [],
        },
        consultantConfirmed: false,
        consultantRationale: '',
      },
    });

    expect(screen.getByTestId('classification-result-card')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Deployer')).toBeInTheDocument();
  });

  it('disables Confirm Classification until rationale meets minimum length', () => {
    renderClassification({
      classification: {
        rulesEngineResult: {
          finalClassification: 'HIGH_RISK',
          step1_prohibition: { isProhibited: false, matchedProvisions: [], flags: [] },
          step2_definition: { possiblyExcluded: false, reason: null },
          step3_annexIII: { anyMatch: true, matchedDomains: ['5b_credit'], matchDetails: {} },
          step4_derogation: { profilingDetected: false, derogationPossible: false, flags: [] },
          step5_role: { primaryRole: 'DEPLOYER', providerRisk: false, flags: [] },
          requiresLegalReview: false,
          flags: [],
        },
        consultantConfirmed: false,
        consultantRationale: '',
      },
    });

    expect(screen.getByTestId('confirm-classification-btn')).toBeDisabled();
  });

  it('enables Confirm Classification after sufficient rationale', () => {
    renderClassification({
      classification: {
        rulesEngineResult: {
          finalClassification: 'HIGH_RISK',
          step1_prohibition: { isProhibited: false, matchedProvisions: [], flags: [] },
          step2_definition: { possiblyExcluded: false, reason: null },
          step3_annexIII: { anyMatch: true, matchedDomains: ['5b_credit'], matchDetails: {} },
          step4_derogation: { profilingDetected: false, derogationPossible: false, flags: [] },
          step5_role: { primaryRole: 'DEPLOYER', providerRisk: false, flags: [] },
          requiresLegalReview: false,
          flags: [],
        },
        consultantConfirmed: false,
        consultantRationale: '',
      },
    });

    const textarea = screen.getByTestId('classification-rationale');
    fireEvent.change(textarea, { target: { value: 'Confirmed after reviewing classification details thoroughly.' } });

    expect(screen.getByTestId('confirm-classification-btn')).toBeEnabled();
  });
});
