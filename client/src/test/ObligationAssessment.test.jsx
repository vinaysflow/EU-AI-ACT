import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ObligationAssessment from '../components/phases/ObligationAssessment';
import { initialState } from '../hooks/useAssessment';

function buildState(overrides = {}) {
  return {
    ...initialState,
    system: {
      ...initialState.system,
      name: 'Test System',
      inputDataController: 'Our organisation',
      deploymentContext: 'Customer-facing',
      ...overrides.system,
    },
    classification: {
      ...initialState.classification,
      rulesEngineResult: {
        finalClassification: 'HIGH_RISK',
        step3_annexIII: { anyMatch: true, matchedDomains: ['5b_credit'], matchDetails: {} },
        step5_role: { primaryRole: 'DEPLOYER', providerRisk: false, flags: [] },
      },
      consultantConfirmed: true,
      ...overrides.classification,
    },
    obligations: overrides.obligations || [],
  };
}

describe('ObligationAssessment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the progress bar', () => {
    const dispatch = vi.fn();
    render(
      <ObligationAssessment
        assessmentState={buildState()}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByTestId('obligation-progress')).toBeInTheDocument();
  });

  it('renders business-line guidance when a line is selected', () => {
    const dispatch = vi.fn();
    render(
      <ObligationAssessment
        assessmentState={buildState({ system: { businessLine: 'credit_lending' } })}
        dispatch={dispatch}
      />,
    );
    const guidancePanel = screen.getByTestId('line-guidance');
    expect(guidancePanel).toBeInTheDocument();
    expect(guidancePanel.textContent).toMatch(/Credit and lending/i);
  });

  it('renders the evaluate button (disabled when form is empty)', () => {
    const dispatch = vi.fn();
    render(
      <ObligationAssessment
        assessmentState={buildState()}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByTestId('evaluate-btn')).toBeInTheDocument();
    expect(screen.getByTestId('evaluate-btn')).toBeDisabled();
  });

  it('renders the verdict card when an obligation has evaluation results', () => {
    const dispatch = vi.fn();
    const state = buildState({
      obligations: [
        {
          obligationId: 'aia_art4',
          status: 'evaluated',
          evidence: {
            controlDescription: 'We have a training programme.',
            evidenceReference: 'Training Policy v2',
            evidenceType: 'Policy',
            confidenceQualifier: 'confirmed',
          },
          evaluationResult: {
            evaluation: {
              verdict: 'COMPLIANT',
              riskSeverity: 'LOW',
              gapDescription: null,
              legalCertainty: 'CLEAR_TEXT',
              confidence: 'HIGH',
              reasoning: 'The AI literacy requirement is met.',
              requirementsSummary: 'Staff training on AI systems.',
              requiresLegalAdvice: false,
            },
            citationVerified: true,
            requiresManualVerification: false,
          },
        },
      ],
    });

    render(
      <ObligationAssessment assessmentState={state} dispatch={dispatch} />,
    );
    expect(screen.getByTestId('verdict-card')).toBeInTheDocument();
    expect(screen.getByText('COMPLIANT')).toBeInTheDocument();
  });

  it('displays all obligation titles in the heading area', () => {
    const dispatch = vi.fn();
    render(
      <ObligationAssessment assessmentState={buildState()} dispatch={dispatch} />,
    );
    expect(screen.getByText('AI Literacy')).toBeInTheDocument();
  });
});
