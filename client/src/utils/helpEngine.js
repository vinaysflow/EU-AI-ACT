const PHASE_ORDER = [
  'scopeWizard',
  'registration',
  'classification',
  'assessment',
  'evidencePack',
  'synthesis',
  'report',
];

const PHASE_LABELS = {
  scopeWizard: 'Scope & Role',
  registration: 'System Registration',
  classification: 'Risk Classification',
  assessment: 'Obligation Assessment',
  evidencePack: 'Evidence Pack',
  synthesis: 'Gap Synthesis',
  report: 'Report Generation',
};

const DEFAULT_OBLIGATION_COUNT = 10;

function buildProgressSummary(assessmentState, currentPhase, unlockedPhases) {
  const currentIndex = Math.max(0, PHASE_ORDER.indexOf(currentPhase));
  const completedPhases = PHASE_ORDER.slice(0, currentIndex)
    .filter((id) => unlockedPhases?.has?.(id)).length;
  const totalPhases = PHASE_ORDER.length;

  const obligations = assessmentState?.obligations || [];
  const evaluatedCount = obligations.filter((o) =>
    o.status === 'evaluated' || o.status === 'confirmed').length;
  const totalObligations = Math.max(DEFAULT_OBLIGATION_COUNT, obligations.length);

  return {
    completedPhases,
    totalPhases,
    currentPhaseProgress: currentPhase === 'assessment'
      ? `${evaluatedCount} of ${totalObligations} obligations evaluated`
      : `${completedPhases} of ${totalPhases - 1} phases complete`,
    overallPercent: Math.round((completedPhases / Math.max(1, totalPhases - 1)) * 100),
  };
}

function pushAction(list, id, label, description, priority, targetPhase) {
  list.push({ id, label, description, priority, targetPhase });
}

export function computeGuidance(assessmentState, currentPhase, unlockedPhases) {
  const blocked =
    unlockedPhases && !unlockedPhases.has?.(currentPhase);
  let blockedReason = null;
  if (blocked) {
    const currentIndex = Math.max(0, PHASE_ORDER.indexOf(currentPhase));
    const prev = PHASE_ORDER[currentIndex - 1];
    blockedReason = prev
      ? `Complete ${PHASE_LABELS[prev]} to unlock.`
      : 'Complete the previous phase to unlock.';
  }

  const nextBestActions = [];
  const contextualHints = [];

  const system = assessmentState?.system || {};
  const classification = assessmentState?.classification || {};
  const obligations = assessmentState?.obligations || [];

  if (currentPhase === 'scopeWizard') {
    if (!assessmentState?.scope?.completed) {
      pushAction(
        nextBestActions,
        'scope-complete',
        'Complete scope wizard',
        'Select your operator role, EU nexus, and any high-risk domains to unlock registration.',
        'high',
        'scopeWizard',
      );
    }
  }

  if (currentPhase === 'registration') {
    const requiredFields = [
      'name',
      'vendor',
      'modelVersion',
      'systemType',
      'intendedPurpose',
      'howOutputsUsed',
      'deploymentContext',
      'affectedPersons',
      'inputDataController',
      'primarySector',
      'businessLine',
      'affectsEuResidents',
    ];
    const missing = requiredFields.filter((key) => {
      const val = system[key];
      return Array.isArray(val) ? val.length === 0 : !val;
    });

    if (!system.name) {
      pushAction(
        nextBestActions,
        'reg-name',
        'Enter system name and vendor',
        'Start by naming the AI system and its provider.',
        'high',
        'registration',
      );
    } else if ((system.intendedPurpose || '').length < 100) {
      pushAction(
        nextBestActions,
        'reg-purpose',
        'Expand intended purpose',
        'Describe the system purpose in at least 100 characters.',
        'high',
        'registration',
      );
    } else if (missing.length > 0) {
      pushAction(
        nextBestActions,
        'reg-required',
        'Complete required fields',
        'Finish all required fields to proceed to Risk Classification.',
        'medium',
        'registration',
      );
    } else {
      pushAction(
        nextBestActions,
        'reg-submit',
        'Review and submit',
        'Save and continue to Risk Classification.',
        'low',
        'registration',
      );
    }

    contextualHints.push(
      { fieldId: 'systemType', text: 'This determines whether the AI Act definition applies. If unsure, select Unknown.' },
      { fieldId: 'intendedPurpose', text: 'Be specific: what does the system do, to whom, and what decisions does it inform?' },
      { fieldId: 'inputDataController', text: 'Select who controls what data flows into the AI system.' },
      { fieldId: 'affectsEuResidents', text: 'The AI Act applies if EU residents are affected, even if your company is outside the EU.' },
    );
  }

  if (currentPhase === 'classification') {
    if (!blocked) {
      if (!classification.rulesEngineResult) {
        pushAction(
          nextBestActions,
          'classify-start',
          'Complete the five-step classification',
          'Answer prohibited practice and Annex III domain questions, then run classification.',
          'high',
          'classification',
        );
      } else if (!classification.consultantConfirmed) {
        pushAction(
          nextBestActions,
          'classify-confirm',
          'Confirm classification',
          'Enter consultant rationale (min 20 characters) to confirm.',
          'high',
          'classification',
        );
      }
    }

    contextualHints.push(
      { fieldId: 'art5', text: 'If any of these apply, the system may be prohibited under the AI Act.' },
      { fieldId: 'annex3', text: 'Check all domains that match. Credit and insurance often trigger Annex III.' },
      { fieldId: 'profiling', text: 'Profiling always results in HIGH_RISK regardless of other factors.' },
      { fieldId: 'roleDetermination', text: 'If you have customised or integrated the system, provider obligations may apply.' },
    );
  }

  if (currentPhase === 'assessment') {
    const evaluatedCount = obligations.filter((o) =>
      o.status === 'evaluated' || o.status === 'confirmed').length;
    const totalObligations = Math.max(DEFAULT_OBLIGATION_COUNT, obligations.length);

    if (evaluatedCount === 0) {
      pushAction(
        nextBestActions,
        'assess-start',
        'Start with Human Oversight',
        'Begin with Art. 26(2) — it is often the first gap in deployments.',
        'high',
        'assessment',
      );
    } else if (evaluatedCount < totalObligations) {
      pushAction(
        nextBestActions,
        'assess-continue',
        'Continue the next obligation',
        'Work through remaining obligations to unlock Evidence Pack.',
        'medium',
        'assessment',
      );
    } else {
      pushAction(
        nextBestActions,
        'assess-review',
        'Review and confirm verdicts',
        'Confirm or override each verdict before proceeding.',
        'low',
        'assessment',
      );
    }

    contextualHints.push(
      { fieldId: 'controlDescription', text: 'Describe the actual control in place, not the aspiration. Min 80 characters.' },
      { fieldId: 'evidenceReference', text: 'Name the document, its version, date, and owner.' },
      { fieldId: 'evidenceType', text: 'Policy = governing document. Procedure = operational steps. Record = proof of execution.' },
      { fieldId: 'confidenceQualifier', text: 'Use “To be confirmed” if evidence has not been independently verified.' },
    );
  }

  if (currentPhase === 'evidencePack') {
    if (!blocked) {
      pushAction(
        nextBestActions,
        'evidence-pack',
        'Prioritise missing Tier 1 artefacts',
        'Focus on required documents first to increase completeness quickly.',
        'medium',
        'evidencePack',
      );
    }
  }

  if (currentPhase === 'synthesis') {
    if (!blocked) {
      if (!assessmentState?.synthesis) {
        pushAction(
          nextBestActions,
          'synthesis-run',
          'Run synthesis',
          'Analyse patterns across obligations to generate the gap register.',
          'high',
          'synthesis',
        );
      } else {
        pushAction(
          nextBestActions,
          'synthesis-review',
          'Assign owners and target dates',
          'Complete the gap register before generating the report.',
          'medium',
          'synthesis',
        );
      }
    }
  }

  if (currentPhase === 'report') {
    if (!blocked) {
      if (!assessmentState?.consultantReviewComplete) {
        pushAction(
          nextBestActions,
          'report-gate',
          'Complete consultant review gate',
          'Check all review items and add your name to unlock exports.',
          'high',
          'report',
        );
      } else {
        pushAction(
          nextBestActions,
          'report-export',
          'Export the report',
          'Export the full report or individual artefacts as needed.',
          'low',
          'report',
        );
      }
    }
  }

  return {
    blockedReason,
    nextBestActions,
    contextualHints,
    progressSummary: buildProgressSummary(assessmentState, currentPhase, unlockedPhases),
  };
}
