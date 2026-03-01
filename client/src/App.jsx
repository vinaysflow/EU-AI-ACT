import { useEffect, useMemo, useState, Component } from 'react';
import DisclaimerBanner from './components/shared/DisclaimerBanner';
import PhaseNav from './components/shared/PhaseNav';
import { useAssessment } from './hooks/useAssessment';
import SystemRegistration from './components/phases/SystemRegistration';
import RiskClassification from './components/phases/RiskClassification';
import ObligationAssessment, { OBLIGATIONS } from './components/phases/ObligationAssessment';
import EvidencePack from './components/phases/EvidencePack';
import GapSynthesis from './components/phases/GapSynthesis';
import ReportGeneration from './components/phases/ReportGeneration';
import ScopeWizard from './components/phases/ScopeWizard';
import { computeGuidance } from './utils/helpEngine';

const PHASES = [
  { id: 'scopeWizard', label: 'Scope & Role', component: ScopeWizard, order: 0 },
  { id: 'registration', label: 'System Registration', component: SystemRegistration, order: 1 },
  { id: 'classification', label: 'Risk Classification', component: RiskClassification, order: 2 },
  { id: 'assessment', label: 'Obligation Assessment', component: ObligationAssessment, order: 3 },
  { id: 'evidencePack', label: 'Evidence Pack', component: EvidencePack, order: 4 },
  { id: 'synthesis', label: 'Gap Synthesis', component: GapSynthesis, order: 5 },
  { id: 'report', label: 'Report Generation', component: ReportGeneration, order: 6 },
];

const STORAGE_KEY = 'eu_ai_act_assessment';
const WELCOME_DISMISSED_KEY = 'eu_ai_act_welcome_dismissed';
const HELP_DISMISSED_KEY = 'eu_ai_act_help_dismissed';

class PhaseErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">
            An error occurred in this phase. Your assessment data is preserved.
            Refresh to continue.
          </h2>
          <details className="mt-2 text-xs text-gray-600">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="whitespace-pre-wrap mt-2">
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveField(obj, dotPath) {
  return dotPath.split('.').reduce((cur, key) => cur?.[key], obj);
}

function evaluateApplicability(ob, state) {
  const cond = ob.applies_conditions;
  if (!cond) return true;
  const results = (cond.required || []).map(({ field, op, value }) => {
    const v = resolveField(state, field);
    if (op === 'eq') return v === value;
    if (op === 'neq') return v !== value;
    if (op === 'includes') {
      if (typeof v === 'string') return v.toLowerCase().includes(String(value).toLowerCase());
      if (Array.isArray(v)) return v.includes(value);
      return false;
    }
    if (op === 'truthy') return !!v;
    return false;
  });
  return cond.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export default function App() {
  const [assessmentState, dispatch] = useAssessment();
  const [currentPhase, setCurrentPhase] = useState('scopeWizard');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const phases = useMemo(
    () => [...PHASES].sort((a, b) => a.order - b.order),
    [],
  );

  const applicableObligations = useMemo(
    () => OBLIGATIONS.filter((ob) => evaluateApplicability(ob, assessmentState)).map((ob) => ob.id),
    [assessmentState],
  );

  const unlockedPhases = useMemo(() => {
    const unlocked = new Set();
    unlocked.add('scopeWizard');

    const scopeComplete = assessmentState.scope?.completed === true;
    if (scopeComplete) unlocked.add('registration');

    const hasSystemName = Boolean(assessmentState.system?.name?.trim());
    if (unlocked.has('registration') && hasSystemName) unlocked.add('classification');

    const consultantConfirmed = assessmentState.classification?.consultantConfirmed === true;
    if (unlocked.has('classification') && consultantConfirmed) unlocked.add('assessment');

    const hasEvaluated = (assessmentState.obligations || [])
      .some((o) => o.status === 'evaluated' || o.status === 'confirmed' || o.consultantVerdict);
    if (unlocked.has('assessment') && hasEvaluated) unlocked.add('evidencePack');

    const allApplicableEvaluated = applicableObligations.every((id) => {
      const ob = (assessmentState.obligations || []).find((o) => o.obligationId === id);
      return ob && (ob.status === 'evaluated' || ob.status === 'confirmed');
    });
    if (unlocked.has('evidencePack') && allApplicableEvaluated) unlocked.add('synthesis');

    if (unlocked.has('synthesis') && assessmentState.synthesis !== null) unlocked.add('report');

    return unlocked;
  }, [assessmentState, applicableObligations]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (!stored && !dismissed) {
        setShowWelcome(true);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(HELP_DISMISSED_KEY);
      if (dismissed) setShowHelp(false);
    } catch {
      // ignore storage failures
    }
  }, []);

  const handleDismissWelcome = () => {
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, '1');
    } catch {
      // ignore storage failures
    }
    setShowWelcome(false);
  };

  const activePhase = phases.find((p) => p.id === currentPhase) || phases[0];
  const ActiveComponent = activePhase.component;
  const guidance = useMemo(
    () => computeGuidance(assessmentState, activePhase.id, unlockedPhases),
    [assessmentState, activePhase.id, unlockedPhases],
  );
  const onPhaseComplete = useMemo(() => {
    switch (activePhase.id) {
      case 'scopeWizard':
        return () => setCurrentPhase('registration');
      case 'registration':
        return () => setCurrentPhase('classification');
      case 'classification':
        return () => setCurrentPhase('assessment');
      case 'assessment':
        return () => setCurrentPhase('evidencePack');
      case 'evidencePack':
        return () => {
          if (unlockedPhases.has('synthesis')) setCurrentPhase('synthesis');
        };
      default:
        return undefined;
    }
  }, [activePhase.id, unlockedPhases]);

  return (
    <>
      <DisclaimerBanner />
      <div className="sticky top-10 z-40 h-0">
        <div className="bg-white border-b border-gray-200 h-16 flex items-center pointer-events-auto">
          <PhaseNav
            phases={phases}
            currentPhase={activePhase.id}
            unlockedPhases={unlockedPhases}
            onPhaseSelect={setCurrentPhase}
          />
        </div>
      </div>
      <main className="pt-[104px] px-6 py-8 bg-gray-50 min-h-screen">
        <PhaseErrorBoundary>
          {showHelp && (guidance?.blockedReason || guidance?.nextBestActions?.length > 0) && (
            <div className="max-w-4xl mx-auto mb-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#0F1B2D] rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4B82] mb-1">
                    Next Steps
                  </p>
                  {guidance.blockedReason ? (
                    <p className="text-sm">{guidance.blockedReason}</p>
                  ) : (
                    <div className="space-y-1">
                      {guidance.nextBestActions.slice(0, 2).map((action) => (
                        <p key={action.id} className="text-sm">
                          <span className="font-semibold">{action.label}:</span> {action.description}
                        </p>
                      ))}
                    </div>
                  )}
                  {guidance.progressSummary?.currentPhaseProgress && (
                    <p className="text-xs text-gray-500 mt-2">
                      {guidance.progressSummary.currentPhaseProgress}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(HELP_DISMISSED_KEY, '1');
                    } catch {
                      // ignore storage failures
                    }
                    setShowHelp(false);
                  }}
                  className="text-xs font-semibold text-[#1B4B82] hover:text-[#163d6b]"
                >
                  Hide
                </button>
              </div>
            </div>
          )}
          {showWelcome && activePhase.id === 'scopeWizard' && (
            <div className="max-w-4xl mx-auto mb-6 bg-[#EFF6FF] border border-[#BFDBFE] text-[#0F1B2D] rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm leading-relaxed">
                  EU AI Act Deployer Assessment — This tool evaluates your obligations under
                  Regulation (EU) 2024/1689 for a specific AI system. Complete each phase in
                  sequence. All findings are preliminary and require qualified legal review.
                </p>
                <button
                  type="button"
                  onClick={handleDismissWelcome}
                  className="text-xs font-semibold text-[#1B4B82] hover:text-[#163d6b]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <ActiveComponent
            assessmentState={assessmentState}
            dispatch={dispatch}
            onComplete={onPhaseComplete}
            canContinue={activePhase.id === 'evidencePack' ? unlockedPhases.has('synthesis') : undefined}
            guidance={guidance}
          />
        </PhaseErrorBoundary>
      </main>
    </>
  );
}
