import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({ toBlob: () => Promise.resolve(new Blob()) })),
  Document: ({ children }) => children,
  Page: ({ children }) => children,
  View: ({ children }) => children,
  Text: ({ children }) => children,
  StyleSheet: { create: (s) => s },
}));

vi.mock('../../pdf/AssessmentReportPDF', () => ({
  default: () => null,
}));

import ReportGeneration from '../components/phases/ReportGeneration';

const fullState = {
  meta: {
    assessmentId: 'ASSMT-001',
    clientName: 'Acme Corp',
    assessmentDate: '2026-01-15',
    leadConsultant: 'Jane Doe',
    regulationVersion: 'EU AI Act (Regulation 2024/1689)',
    corpusVersion: '2026-01',
    status: 'in_review',
  },
  system: {
    name: 'Credit Scorer',
    vendor: 'Acme AI',
    modelVersion: 'v2',
    intendedPurpose: 'Score credit applicants using financial data and transactional patterns.',
    deploymentContext: 'Customer-facing',
    affectsEuResidents: 'yes',
    inputDataController: 'Our organisation',
  },
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
    consultantConfirmed: true,
    consultantRationale: 'Reviewed and confirmed.',
  },
  obligations: [
    {
      obligationId: 'aia_art4',
      status: 'evaluated',
      evidence: {
        controlDescription: 'Staff training programme.',
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
          reasoning: 'Met.',
          requirementsSummary: 'Staff training.',
          requiresLegalAdvice: false,
        },
        citationVerified: true,
        requiresManualVerification: false,
      },
    },
  ],
  synthesis: {
    riskPosture: 'LOW',
    keyInsights: ['All clear.'],
    gapRegister: [],
    remediationPhases: [],
    patternAnalysis: 'No issues.',
  },
  consultantReviewComplete: false,
  exportedAt: null,
};

describe('ReportGeneration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the consultant gate section', () => {
    const dispatch = vi.fn();
    render(<ReportGeneration assessmentState={fullState} dispatch={dispatch} />);
    expect(screen.getByTestId('consultant-gate')).toBeInTheDocument();
  });

  it('does not show export section when consultant gate is incomplete', () => {
    const dispatch = vi.fn();
    render(<ReportGeneration assessmentState={fullState} dispatch={dispatch} />);
    expect(screen.queryByTestId('export-full-pdf')).not.toBeInTheDocument();
  });

  it('shows export buttons after completing consultant gate', () => {
    const dispatch = vi.fn();
    render(<ReportGeneration assessmentState={fullState} dispatch={dispatch} />);

    const checkboxes = screen.getByTestId('consultant-gate').querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      fireEvent.click(cb);
    }

    const nameInput = screen.getByTestId('consultant-name-input');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    const signBtn = screen.getByText('Generate and sign assessment');
    fireEvent.click(signBtn);

    expect(screen.getByTestId('export-full-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('export-evidence-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('export-excel')).toBeInTheDocument();
  });

  it('renders the system name in artefact A', () => {
    const dispatch = vi.fn();
    render(<ReportGeneration assessmentState={fullState} dispatch={dispatch} />);
    expect(screen.getByText('Credit Scorer')).toBeInTheDocument();
  });
});
