import { useState, useCallback, useMemo } from 'react';

/* ─────────────────────── CONSTANTS ─────────────────────── */

const ART5_TOGGLES = [
  {
    key: 'usesSubliminalTechniques',
    label: 'Uses subliminal techniques to distort behaviour',
    legalText:
      'Art. 5(1)(a) — AI systems that deploy subliminal techniques beyond a person\'s consciousness, or purposefully manipulative or deceptive techniques, with the objective or effect of materially distorting the behaviour of a person or group, causing or likely to cause significant harm.',
  },
  {
    key: 'exploitsVulnerabilities',
    label: 'Exploits vulnerabilities of specific groups',
    legalText:
      'Art. 5(1)(b) — AI systems that exploit vulnerabilities of a specific group of persons due to their age, disability, or a specific social or economic situation, with the objective or effect of materially distorting the behaviour of that person or group, causing or likely to cause significant harm.',
  },
  {
    key: 'createsSocialScore',
    label: 'Social scoring by public authorities',
    legalText:
      'Art. 5(1)(c) — AI systems for evaluation or classification of natural persons or groups over a period of time based on their social behaviour or known/inferred personal or personality characteristics, resulting in social scoring leading to detrimental or unfavourable treatment.',
  },
  {
    key: 'assessesCriminalRiskByProfilingOnly',
    label: 'Assesses criminal risk based solely on profiling',
    legalText:
      'Art. 5(1)(d) — AI systems to make risk assessments of natural persons to assess or predict the risk of a natural person committing a criminal offence, based solely on profiling or on assessing personality traits and characteristics.',
  },
  {
    key: 'createsFacialRecognitionDatabase',
    label: 'Creates facial recognition databases via untargeted scraping',
    legalText:
      'Art. 5(1)(e) — AI systems that create or expand facial recognition databases through the untargeted scraping of facial images from the internet or CCTV footage.',
  },
  {
    key: 'infersEmotionsAtWorkOrSchool',
    label: 'Infers emotions in the workplace or education',
    legalText:
      'Art. 5(1)(f) — AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except where the AI system is intended to be put into place or on the market for medical or safety reasons.',
  },
  {
    key: 'biometricCategorisesByProtectedAttributes',
    label: 'Biometric categorisation by protected attributes',
    legalText:
      'Art. 5(1)(g) — AI systems that use biometric categorisation to categorise individually natural persons based on their biometric data to deduce or infer their race, political opinions, trade union membership, religious or philosophical beliefs, sex life, or sexual orientation.',
  },
  {
    key: 'isRealTimeRBILawEnforcement',
    label: 'Real-time remote biometric ID for law enforcement',
    legalText:
      'Art. 5(1)(h) — The use of real-time remote biometric identification systems in publicly accessible spaces for the purpose of law enforcement, unless and in as far as such use is strictly necessary for specific objectives set out in the Regulation.',
  },
];

const ANNEX3_DOMAINS = [
  {
    domain: '1',
    title: 'Biometrics',
    items: [
      { key: 'isRemoteBiometricID', label: 'Remote biometric identification (not real-time)', ref: 'Annex III, 1(a)' },
      { key: 'isEmotionRecognition', label: 'Emotion recognition systems', ref: 'Annex III, 1(b)' },
      { key: 'isBiometricCategorisation', label: 'Biometric categorisation systems', ref: 'Annex III, 1(c)' },
    ],
  },
  {
    domain: '2',
    title: 'Critical Infrastructure',
    items: [
      { key: 'isCriticalInfrastructure', label: 'Safety components of critical infrastructure (energy, transport, water, gas, heating, internet)', ref: 'Annex III, 2(a)' },
    ],
  },
  {
    domain: '3',
    title: 'Education & Vocational Training',
    items: [
      { key: 'isEducationAdmissions', label: 'Education and vocational training — admissions or assessment', ref: 'Annex III, 3(a)' },
    ],
  },
  {
    domain: '4',
    title: 'Employment, Workers Management & Access to Self-Employment',
    items: [
      { key: 'isRecruitmentOrHrDecisions', label: 'Recruitment or selection of natural persons (CV screening, filtering, evaluating)', ref: 'Annex III, 4(a)' },
      { key: 'isPerformanceManagement', label: 'Performance monitoring and evaluation of employees', ref: 'Annex III, 4(b)' },
    ],
    expandedByDefault: true,
  },
  {
    domain: '5',
    title: 'Access to Essential Services — Credit, Insurance, Public Benefits',
    items: [
      { key: 'isPublicBenefitsEligibility', label: 'Evaluate eligibility for public assistance benefits and services', ref: 'Annex III, 5(a)' },
      { key: 'isCreditScoring', label: 'Creditworthiness assessment of natural persons (credit scoring)', ref: 'Annex III, 5(b)' },
      { key: 'isInsuranceRiskPricing', label: 'Risk assessment and pricing for life and health insurance', ref: 'Annex III, 5(c)' },
    ],
    expandedByDefault: true,
    hasCreditException: true,
  },
  {
    domain: '6',
    title: 'Law Enforcement',
    items: [
      { key: 'isLawEnforcement', label: 'AI systems used by law enforcement', ref: 'Annex III, 6(a)' },
    ],
  },
  {
    domain: '7',
    title: 'Migration, Asylum & Border Control',
    items: [
      { key: 'isBorderControl', label: 'Migration, asylum, and border control management', ref: 'Annex III, 7(a)' },
    ],
  },
  {
    domain: '8',
    title: 'Administration of Justice & Democratic Processes',
    items: [
      { key: 'isJudicialAdministration', label: 'Administration of justice and democratic processes', ref: 'Annex III, 8(a)' },
      { key: 'isElectionInfluence', label: 'AI systems intended to influence elections', ref: 'Annex III, 8(b)' },
    ],
  },
];

const ART6_3_QUESTIONS = [
  { key: 'performsProfilingOfPersons', label: 'Does the system perform profiling of natural persons?', type: 'yesno' },
  { key: 'materiallyInfluencesDecisionOutcome', label: 'Does the AI output materially influence the final decision outcome?', type: 'yesno' },
  { key: 'humanMakesFinalDecision', label: 'Does a human make the final decision using the AI output?', type: 'yesno' },
  {
    key: 'consequenceOfIncorrectOutput',
    label: 'What is the consequence of an incorrect output?',
    type: 'select',
    options: [
      { value: 'NONE', label: 'None' },
      { value: 'LOW', label: 'Low' },
      { value: 'SIGNIFICANT', label: 'Significant' },
      { value: 'SEVERE', label: 'Severe' },
    ],
  },
];

const ROLE_OPTIONS = [
  { key: 'builtInhouse', label: 'We built this AI system in-house' },
  { key: 'purchasedNoCustomisation', label: 'We purchased/licensed an off-the-shelf system with no customisation' },
  { key: 'significantlyCustomised', label: 'We significantly customised a third-party system (changed intended purpose, retrained, etc.)' },
  { key: 'accessedViaAPIInOwnProduct', label: 'We access a third-party model via API and integrate it into our own product' },
];

const FLAG_EXPLANATIONS = {
  ROLE_AMBIGUITY: 'Your deployment pattern suggests you may bear provider-level obligations under Art. 25. Legal review of your exact role is recommended.',
  AI_DEFINITION_CONTESTED: 'The system is described as rules-based. Whether it meets the AI Act\'s Art. 3(1) definition is contestable and requires legal review.',
  PROFILING_DETECTED: 'The system performs profiling of natural persons. Under Art. 6(3) final paragraph, profiling systems cannot benefit from derogation and remain high-risk.',
  ART6_3_DEROGATION_POSSIBLE: 'Art. 6(3) conditions for derogation appear to be met: the output is not materially influential, a human makes the final decision, and consequences are low. Classification may be downgraded from HIGH_RISK, subject to legal review.',
};

const STEP_LABELS = [
  'Art. 5 Screening',
  'AI Definition',
  'Annex III Domains',
  'Art. 6(3) Assessment',
  'Role Determination',
];

const CLASSIFICATION_COLORS = {
  PROHIBITED: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', label: 'Prohibited' },
  HIGH_RISK: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', label: 'High Risk' },
  CLASSIFICATION_CONTESTED: { bg: '#FEF3C7', border: '#D97706', text: '#92400E', label: 'Contested — Legal Review Required' },
  LIMITED_OR_MINIMAL_RISK: { bg: '#D1FAE5', border: '#059669', text: '#065F46', label: 'Limited / Minimal Risk' },
};

const ROLE_LABELS = {
  PROVIDER: 'Provider',
  PROVIDER_UNDER_ART25: 'Provider (Art. 25)',
  DEPLOYER: 'Deployer',
};

/* ─────────────────────── SUB-COMPONENTS ─────────────────────── */

function StepIndicator({ steps, currentStep, completedSteps, skippedSteps }) {
  return (
    <div className="flex flex-col gap-1">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = completedSteps.has(stepNum);
        const isSkipped = skippedSteps.has(stepNum);
        const isCurrent = currentStep === stepNum;

        let dotColor = 'bg-gray-300';
        let textColor = 'text-gray-400';
        if (isCurrent) { dotColor = 'bg-[#1B4B82]'; textColor = 'text-[#0F1B2D]'; }
        else if (isCompleted) { dotColor = 'bg-green-500'; textColor = 'text-gray-600'; }
        else if (isSkipped) { dotColor = 'bg-gray-400'; textColor = 'text-gray-400'; }

        return (
          <div key={stepNum} className="flex items-center gap-3 py-2">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${dotColor}`}>
                {isCompleted ? '✓' : isSkipped ? '—' : stepNum}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
            <span className={`text-sm font-medium ${textColor}`} style={{ fontFamily: 'Inter, sans-serif' }}>
              {label}
              {isSkipped && <span className="ml-1 text-xs">(skipped)</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3 bg-white text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{children}</div>}
    </div>
  );
}

function YesNoToggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${value === true ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${value === false ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          NO
        </button>
      </div>
      {label && <span className="text-sm text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</span>}
    </div>
  );
}

function ClassificationBadge({ classification }) {
  const config = CLASSIFICATION_COLORS[classification] || CLASSIFICATION_COLORS.LIMITED_OR_MINIMAL_RISK;
  return (
    <span
      className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border"
      style={{ backgroundColor: config.bg, borderColor: config.border, color: config.text, fontFamily: 'Inter, sans-serif' }}
    >
      {config.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const label = ROLE_LABELS[role] || role;
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-[#1B4B82] text-[#1B4B82] bg-blue-50"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {label}
    </span>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */

export default function RiskClassification({ assessmentState, dispatch, onComplete, guidance }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [skippedSteps, setSkippedSteps] = useState(new Set());
  const hintMap = useMemo(
    () => Object.fromEntries((guidance?.contextualHints || []).map((hint) => [hint.fieldId, hint.text])),
    [guidance],
  );
  const callout = guidance?.nextBestActions?.[0];

  const [art5Responses, setArt5Responses] = useState(
    () => Object.fromEntries(ART5_TOGGLES.map((t) => [t.key, assessmentState.system.art5Responses?.[t.key] ?? null]))
  );
  const [art5Acknowledged, setArt5Acknowledged] = useState(false);

  const [aiDefinitionChoice, setAiDefinitionChoice] = useState(null);

  const [annex3Responses, setAnnex3Responses] = useState(
    () => {
      const init = {};
      ANNEX3_DOMAINS.forEach((d) => d.items.forEach((item) => { init[item.key] = assessmentState.system.annex3Responses?.[item.key] ?? false; }));
      init.isCreditFraudDetection = assessmentState.system.annex3Responses?.isCreditFraudDetection ?? false;
      return init;
    }
  );

  const [art6Responses, setArt6Responses] = useState(
    () => ({
      performsProfilingOfPersons: assessmentState.system.art6_3Responses?.performsProfilingOfPersons ?? null,
      materiallyInfluencesDecisionOutcome: assessmentState.system.art6_3Responses?.materiallyInfluencesDecisionOutcome ?? null,
      humanMakesFinalDecision: assessmentState.system.art6_3Responses?.humanMakesFinalDecision ?? null,
      consequenceOfIncorrectOutput: assessmentState.system.art6_3Responses?.consequenceOfIncorrectOutput ?? '',
    })
  );

  const [roleResponses, setRoleResponses] = useState(
    () => ({
      builtInhouse: assessmentState.system.roleResponses?.builtInhouse ?? false,
      purchasedNoCustomisation: assessmentState.system.roleResponses?.purchasedNoCustomisation ?? false,
      significantlyCustomised: assessmentState.system.roleResponses?.significantlyCustomised ?? false,
      accessedViaAPIInOwnProduct: assessmentState.system.roleResponses?.accessedViaAPIInOwnProduct ?? false,
    })
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(assessmentState.classification?.rulesEngineResult || null);
  const [rationale, setRationale] = useState(assessmentState.classification?.consultantRationale || '');
  const [prohibitedModalAck, setProhibitedModalAck] = useState(false);

  const hasArt5Positives = Object.values(art5Responses).some((v) => v === true);
  const art5PositiveKeys = ART5_TOGGLES.filter((t) => art5Responses[t.key] === true);
  const allArt5Answered = Object.values(art5Responses).every((v) => v !== null);

  const annexMatchCount = ANNEX3_DOMAINS.reduce((acc, d) => {
    return acc + d.items.filter((item) => {
      if (item.key === 'isCreditScoring' && annex3Responses.isCreditFraudDetection) return false;
      return annex3Responses[item.key];
    }).length;
  }, 0);
  const hasAnnexMatch = annexMatchCount > 0;

  const isRulesBased = assessmentState.system.systemType === 'rules_based';
  const roleHasAmbiguity = roleResponses.significantlyCustomised || roleResponses.accessedViaAPIInOwnProduct;

  const markComplete = useCallback((step) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const markSkipped = useCallback((step) => {
    setSkippedSteps((prev) => new Set([...prev, step]));
  }, []);

  const proceedStep1 = () => {
    dispatch({ type: 'SET_SYSTEM_FACTS', payload: { art5Responses } });
    markComplete(1);
    if (isRulesBased) {
      setCurrentStep(2);
    } else {
      markSkipped(2);
      setCurrentStep(3);
    }
  };

  const proceedStep2 = (choice) => {
    setAiDefinitionChoice(choice);
    markComplete(2);
    setCurrentStep(3);
  };

  const proceedStep3 = () => {
    dispatch({ type: 'SET_SYSTEM_FACTS', payload: { annex3Responses } });
    markComplete(3);
    if (hasAnnexMatch) {
      setCurrentStep(4);
    } else {
      markSkipped(4);
      setCurrentStep(5);
    }
  };

  const proceedStep4 = () => {
    dispatch({ type: 'SET_SYSTEM_FACTS', payload: { art6_3Responses: art6Responses } });
    markComplete(4);
    setCurrentStep(5);
  };

  const proceedStep5 = async () => {
    dispatch({ type: 'SET_SYSTEM_FACTS', payload: { roleResponses } });
    markComplete(5);

    const systemFacts = {
      ...assessmentState.system,
      systemPurpose: assessmentState.system.intendedPurpose,
      art5Responses,
      annex3Responses,
      art6_3Responses: art6Responses,
      roleResponses,
    };

    if (aiDefinitionChoice === 'excluded') {
      systemFacts.systemType = 'rules_based';
    }

    setLoading(true);
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemFacts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Classification failed');
      setResult(data.result);
      dispatch({ type: 'SET_CLASSIFICATION_RULES_RESULT', payload: data.result });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmClassification = () => {
    dispatch({ type: 'CONFIRM_CLASSIFICATION', payload: rationale });
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  /* ─────────── Step Renderers ─────────── */

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Step 1 — Article 5: Prohibited Practice Screening
        </h3>
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
          Determine whether this AI system falls under any prohibited practice. Answer YES or NO for each provision.
        </p>
        {hintMap.art5 && (
          <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hintMap.art5}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {ART5_TOGGLES.map((toggle) => (
          <div key={toggle.key} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <YesNoToggle
              value={art5Responses[toggle.key]}
              onChange={(val) => setArt5Responses((prev) => ({ ...prev, [toggle.key]: val }))}
              label={toggle.label}
            />
            <Collapsible title={`Verbatim — ${toggle.key.replace(/([A-Z])/g, ' $1').trim()}`}>
              <p className="italic text-gray-500">{toggle.legalText}</p>
            </Collapsible>
          </div>
        ))}
      </div>

      {hasArt5Positives && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
          <p className="text-red-800 font-semibold text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            ⚠ One or more prohibited practices have been flagged:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {art5PositiveKeys.map((t) => (
              <li key={t.key}>{t.label}</li>
            ))}
          </ul>
          <p className="text-sm text-red-700">
            If confirmed, this system <strong>cannot be placed on the EU market</strong>. Proceeding will record these findings. Legal review is mandatory.
          </p>
          <label className="flex items-start gap-2 text-sm text-red-800 cursor-pointer">
            <input
              type="checkbox"
              checked={art5Acknowledged}
              onChange={(e) => setArt5Acknowledged(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            <span>I acknowledge that one or more prohibited practices have been identified and that legal review is required before any further deployment decisions.</span>
          </label>
        </div>
      )}

      <button
        type="button"
        data-testid="classify-step1-proceed"
        disabled={!allArt5Answered || (hasArt5Positives && !art5Acknowledged)}
        onClick={proceedStep1}
        className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
      >
        Proceed
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Step 2 — AI Definition Check (Article 3(1))
        </h3>
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
          This system is described as <strong>rules-based</strong>. The EU AI Act definition in Article 3(1) may not cover purely rules-based systems without inference or learning capabilities.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => proceedStep2('proceed')}
          className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
          style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
        >
          Proceed with full assessment
        </button>
        <button
          type="button"
          onClick={() => proceedStep2('excluded')}
          className="px-5 py-2.5 rounded-lg border-2 font-semibold text-sm"
          style={{ borderColor: '#D97706', color: '#92400E', fontFamily: 'Inter, sans-serif' }}
        >
          Mark as possibly excluded
        </button>
      </div>

      {aiDefinitionChoice === 'excluded' && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
          <p className="text-amber-800 text-sm font-semibold">
            AI_DEFINITION_CONTESTED flag will be set.
          </p>
          <p className="text-sm text-amber-700">
            The system will be flagged for legal review regarding whether it meets the AI Act\'s definition. You may continue the assessment to capture a full classification, but the final result will require legal confirmation.
          </p>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-amber-800 border border-amber-400 hover:bg-amber-100 transition-colors"
          >
            Continue anyway →
          </button>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Step 3 — Annex III Domain Matching
        </h3>
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
          Select any high-risk domains that apply to this system. Toggle items that match.
        </p>
        {hintMap.annex3 && (
          <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hintMap.annex3}
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
        <p className="text-sm font-semibold" style={{ color: '#1B4B82', fontFamily: 'Inter, sans-serif' }}>
          {annexMatchCount} potential high-risk domain{annexMatchCount !== 1 ? 's' : ''} matched
        </p>
      </div>

      <div className="space-y-4">
        {ANNEX3_DOMAINS.map((domainGroup) => (
          <Collapsible
            key={domainGroup.domain}
            title={`Domain ${domainGroup.domain} — ${domainGroup.title}`}
            defaultOpen={domainGroup.expandedByDefault || false}
          >
            <div className="space-y-3">
              {domainGroup.items.map((item) => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annex3Responses[item.key] || false}
                    onChange={(e) => setAnnex3Responses((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 accent-[#1B4B82]"
                  />
                  <div>
                    <span className="text-sm text-gray-800">{item.label}</span>
                    <span className="block text-xs text-gray-400">{item.ref}</span>
                  </div>
                </label>
              ))}

              {domainGroup.hasCreditException && (
                <div className="ml-6 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annex3Responses.isCreditFraudDetection || false}
                      onChange={(e) => setAnnex3Responses((prev) => ({ ...prev, isCreditFraudDetection: e.target.checked }))}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div>
                      <span className="text-sm text-amber-800 font-medium">Credit scoring exception: system is used solely for fraud detection</span>
                      <span className="block text-xs text-amber-600 mt-0.5">
                        If checked, credit scoring (Domain 5b) will NOT count as a high-risk match per Art. 6(2) exception.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </Collapsible>
        ))}
      </div>

      <button
        type="button"
        onClick={proceedStep3}
        className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors"
        style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
      >
        Proceed
      </button>
    </div>
  );

  const renderStep4 = () => {
    const profilingYes = art6Responses.performsProfilingOfPersons === true;
    const allAnswered =
      art6Responses.performsProfilingOfPersons !== null &&
      art6Responses.materiallyInfluencesDecisionOutcome !== null &&
      art6Responses.humanMakesFinalDecision !== null &&
      art6Responses.consequenceOfIncorrectOutput !== '';

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
            Step 4 — Art. 6(3) Assessment
          </h3>
          <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            This system matched one or more Annex III domains. Answer the following to determine if Art. 6(3) derogation conditions apply.
          </p>
          {hintMap.profiling && (
            <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              {hintMap.profiling}
            </p>
          )}
        </div>

        <div className="space-y-5">
          {ART6_3_QUESTIONS.map((q) => (
            <div key={q.key} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>{q.label}</p>
              {q.type === 'yesno' ? (
                <YesNoToggle
                  value={art6Responses[q.key]}
                  onChange={(val) => setArt6Responses((prev) => ({ ...prev, [q.key]: val }))}
                />
              ) : (
                <select
                  value={art6Responses[q.key] || ''}
                  onChange={(e) => setArt6Responses((prev) => ({ ...prev, [q.key]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <option value="" disabled>Select…</option>
                  {q.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        {profilingYes && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800" style={{ fontFamily: 'Inter, sans-serif' }}>
              Profiling Detected
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Systems that perform profiling of natural persons are <strong>always classified as high-risk</strong> regardless of other Art. 6(3) derogation criteria (Article 6(3), final paragraph).
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={!allAnswered}
          onClick={proceedStep4}
          className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
        >
          Proceed
        </button>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Step 5 — Role Determination
        </h3>
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
          Select the option that best describes your organisation's relationship with this AI system.
        </p>
        {hintMap.roleDetermination && (
          <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hintMap.roleDetermination}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {ROLE_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={roleResponses[opt.key]}
              onChange={(e) => setRoleResponses((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
              className="mt-0.5 accent-[#1B4B82]"
            />
            <span className="text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>{opt.label}</span>
          </label>
        ))}
      </div>

      {roleHasAmbiguity && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-800" style={{ fontFamily: 'Inter, sans-serif' }}>
            Role Ambiguity Detected
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Significant customisation or API integration into your own product may trigger provider obligations under Article 25 of the AI Act. Legal review of your exact role is recommended.
          </p>
        </div>
      )}

      <button
        type="button"
        data-testid="classify-system-btn"
        disabled={!Object.values(roleResponses).some(Boolean)}
        onClick={proceedStep5}
        className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
      >
        Classify System
      </button>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B4B82] rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Classifying system…</p>
    </div>
  );

  const renderResult = () => {
    if (result.error) {
      return (
        <div className="bg-red-50 border border-red-300 rounded-lg p-6">
          <p className="text-red-800 font-semibold text-sm">Classification Error</p>
          <p className="text-red-700 text-sm mt-1">{result.error}</p>
        </div>
      );
    }

    const isProhibited = result.finalClassification === 'PROHIBITED';
    const isContested = result.finalClassification === 'CLASSIFICATION_CONTESTED';
    const confirmed = assessmentState.classification?.consultantConfirmed;

    return (
      <div className="space-y-6">
        {isProhibited && !prohibitedModalAck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-5">
              <h3 className="text-xl font-bold text-red-800" style={{ fontFamily: 'Georgia, serif' }}>
                Prohibited Classification
              </h3>
              <p className="text-sm text-red-700 leading-relaxed">
                This system has been classified as <strong>PROHIBITED</strong> under Article 5 of the EU AI Act.
                It <strong>cannot be placed on the market or put into service</strong> in the European Union.
                Legal review is mandatory before any further action.
              </p>
              <label className="flex items-start gap-2 text-sm text-red-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prohibitedModalAck}
                  onChange={(e) => setProhibitedModalAck(e.target.checked)}
                  className="mt-0.5 accent-red-600"
                />
                <span>I acknowledge this prohibited classification and the requirement for mandatory legal review.</span>
              </label>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
            Classification Result
          </h3>
        </div>

        <div data-testid="classification-result-card" className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <ClassificationBadge classification={result.finalClassification} />
            {result.step5_role && <RoleBadge role={result.step5_role.primaryRole} />}
          </div>

          {result.requiresLegalReview && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                Legal Review Required
              </p>
              <p className="text-sm text-amber-700 mt-1">
                This classification requires confirmation by a qualified legal professional before it can be relied upon for compliance decisions.
              </p>
            </div>
          )}

          {isContested && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                Classification Contested
              </p>
              <p className="text-sm text-amber-700 mt-1">
                The classification could not be determined definitively. This may be due to Art. 6(3) derogation conditions being met or the AI definition being contestable.
                A legal professional must review the facts and confirm or override this preliminary classification.
              </p>
            </div>
          )}

          {result.flags && result.flags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>Flags</p>
              <div className="space-y-2">
                {result.flags.map((flag) => (
                  <div key={flag} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-mono text-gray-500">{flag}</p>
                    {FLAG_EXPLANATIONS[flag] && (
                      <p className="text-sm text-gray-700 mt-1">{FLAG_EXPLANATIONS[flag]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!confirmed && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
              Consultant Confirmation
            </h4>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              Provide your rationale for accepting or noting this classification (minimum 20 characters).
            </p>
            <div className="relative">
              <textarea
                data-testid="classification-rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4B82] focus:border-transparent"
                style={{ fontFamily: 'Inter, sans-serif' }}
                placeholder="Enter your rationale for this classification…"
              />
              <span className={`absolute bottom-2 right-3 text-xs ${rationale.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                {rationale.length}/20 min
              </span>
            </div>
            <button
              type="button"
              data-testid="confirm-classification-btn"
              disabled={rationale.length < 20}
              onClick={confirmClassification}
              className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
            >
              Confirm Classification
            </button>
          </div>
        )}

        {confirmed && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-green-800" style={{ fontFamily: 'Inter, sans-serif' }}>
              ✓ Classification confirmed by consultant
            </p>
            <p className="text-sm text-green-700 mt-1">{assessmentState.classification.consultantRationale}</p>
            <button
              type="button"
              onClick={() => {
                if (typeof onComplete === 'function') onComplete();
              }}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#1B4B82] hover:bg-[#163d6a] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Continue to Obligation Assessment
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ─────────── Layout ─────────── */

  const renderCurrentStep = () => {
    if (loading) return renderLoading();
    if (result) return renderResult();

    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <section className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Risk Classification
        </h2>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          EU AI Act — Systematic classification through Articles 5, 6 and Annex III
        </p>
      </div>

      {callout && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Next best action
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{callout.label}:</span> {callout.description}
          </p>
        </div>
      )}

      <div className="flex gap-8">
        <div className="w-56 flex-shrink-0">
          <div className="sticky top-20 bg-white border border-gray-200 rounded-xl p-4">
            <StepIndicator
              steps={STEP_LABELS}
              currentStep={result ? null : currentStep}
              completedSteps={completedSteps}
              skippedSteps={skippedSteps}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </section>
  );
}
