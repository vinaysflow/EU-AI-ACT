import { useState, useCallback } from 'react';

const OPERATOR_ROLES = [
  { value: 'provider', label: 'Provider — you develop or place the AI system on the market' },
  { value: 'deployer', label: 'Deployer — you use an AI system under your authority' },
  { value: 'importer', label: 'Importer — you bring a third-country AI system into the EU market' },
  { value: 'distributor', label: 'Distributor — you make an AI system available on the EU market' },
];

const GPAI_ROLES = [
  { value: 'none', label: 'Not applicable' },
  { value: 'gpai_provider', label: 'GPAI model provider' },
  { value: 'gpai_adapter', label: 'GPAI adapter / fine-tuner' },
];

const RISK_DOMAINS = [
  { value: 'biometrics', label: 'Biometrics and identity (Annex III 1)' },
  { value: 'critical_infrastructure', label: 'Critical infrastructure (Annex III 2)' },
  { value: 'education', label: 'Education and vocational training (Annex III 3)' },
  { value: 'employment', label: 'Employment and worker management (Annex III 4)' },
  { value: 'credit', label: 'Credit scoring and lending (Annex III 5b)' },
  { value: 'insurance', label: 'Insurance risk and pricing (Annex III 5c)' },
  { value: 'law_enforcement', label: 'Law enforcement (Annex III 6)' },
  { value: 'migration', label: 'Migration, asylum and border control (Annex III 7)' },
  { value: 'justice', label: 'Administration of justice and democratic processes (Annex III 8)' },
  { value: 'healthcare', label: 'Healthcare and life sciences' },
  { value: 'public_services', label: 'Public sector services' },
  { value: 'transport', label: 'Transport and mobility' },
  { value: 'other', label: 'Other / general purpose' },
];

const MODE_OPTIONS = [
  {
    value: 'founder',
    label: 'Founder Mode',
    description: 'Ship safely with minimum overhead. Lean evidence pack, vendor flow-down, 90-day build plan.',
  },
  {
    value: 'regulator',
    label: 'Regulator Mode',
    description: 'Enforcement and interoperability lens. Policy controls matrix, procurement guidance.',
  },
  {
    value: 'enterprise',
    label: 'Enterprise Mode',
    description: 'Audit-ready at scale. Approvals, versioning, sign-offs, reassessment triggers.',
  },
];

const TIMELINE = [
  { date: 'Feb 2, 2025', label: 'Prohibited practices + AI literacy obligations apply', active: true },
  { date: 'Aug 2, 2025', label: 'GPAI model obligations apply', active: true },
  { date: 'Aug 2, 2026', label: 'Full AI Act applicability', active: false },
  { date: 'Aug 2, 2027', label: 'Certain high-risk AI system transition deadline', active: false },
];

const sectionHeading = 'font-serif text-lg font-bold text-[#0F1B2D] mb-1';
const cardClass = 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6';

export default function ScopeWizard({ assessmentState, dispatch, onComplete, guidance }) {
  const scope = assessmentState?.scope || {};
  const meta = assessmentState?.meta || {};
  const callout = guidance?.nextBestActions?.[0];

  const [operatorRole, setOperatorRole] = useState(scope.operatorRole || '');
  const [gpaiRole, setGpaiRole] = useState(scope.gpaiRole || 'none');
  const [euNexus, setEuNexus] = useState(scope.euNexus || {
    placedOnEUMarket: false, usedInEU: false, outputAffectsEUPersons: false,
  });
  const [riskDomains, setRiskDomains] = useState(scope.riskDomainFlags || []);
  const [mode, setMode] = useState(meta.mode || '');
  const [errors, setErrors] = useState({});

  const toggleNexus = useCallback((key) => {
    setEuNexus((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleDomain = useCallback((domain) => {
    setRiskDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  }, []);

  const validate = useCallback(() => {
    const next = {};
    if (!operatorRole) next.operatorRole = 'Select your role under the AI Act';
    if (!mode) next.mode = 'Select an assessment mode';
    const anyNexus = euNexus.placedOnEUMarket || euNexus.usedInEU || euNexus.outputAffectsEUPersons;
    if (!anyNexus) next.euNexus = 'At least one EU nexus condition must apply for the AI Act to be relevant';
    return next;
  }, [operatorRole, mode, euNexus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }

    dispatch({
      type: 'SET_SCOPE',
      payload: {
        operatorRole,
        gpaiRole,
        euNexus,
        riskDomainFlags: riskDomains,
        completed: true,
      },
    });
    dispatch({ type: 'SET_MODE', payload: mode });

    const roleDefaults = {};
    if (operatorRole === 'provider') roleDefaults.builtInhouse = true;
    if (operatorRole === 'deployer') roleDefaults.purchasedNoCustomisation = true;
    dispatch({ type: 'SET_SYSTEM_FACTS', payload: { roleResponses: roleDefaults } });

    const annexDefaults = {};
    if (riskDomains.includes('credit')) annexDefaults.isCreditScoring = true;
    if (riskDomains.includes('insurance')) annexDefaults.isInsuranceRiskPricing = true;
    if (riskDomains.includes('employment')) annexDefaults.isEmploymentDecision = true;
    if (riskDomains.includes('education')) annexDefaults.isEducationAccess = true;
    if (riskDomains.includes('biometrics')) annexDefaults.isBiometricIdentification = true;
    if (riskDomains.includes('law_enforcement')) annexDefaults.isLawEnforcement = true;
    if (riskDomains.includes('migration')) annexDefaults.isMigrationAsylum = true;
    if (riskDomains.includes('justice')) annexDefaults.isJusticeAdministration = true;
    if (riskDomains.includes('critical_infrastructure')) annexDefaults.isCriticalInfrastructure = true;
    if (Object.keys(annexDefaults).length > 0) {
      dispatch({ type: 'SET_SYSTEM_FACTS', payload: { annex3Responses: annexDefaults } });
    }

    if (typeof onComplete === 'function') onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6" data-testid="scope-wizard">
      {callout && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Next best action
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{callout.label}:</span> {callout.description}
          </p>
        </div>
      )}
      {/* Timeline banner */}
      <div className="bg-[#0F1B2D] text-white rounded-lg p-5">
        <h2 className="text-base font-bold mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          EU AI Act — Phased Applicability
        </h2>
        <div className="space-y-2">
          {TIMELINE.map((t) => (
            <div key={t.date} className="flex items-start gap-3">
              <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.active ? 'bg-green-400' : 'bg-gray-500'}`} />
              <div>
                <span className="text-sm font-semibold">{t.date}</span>
                <span className="text-sm text-gray-300 ml-2">{t.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <section className={cardClass}>
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          Assessment Mode
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Choose how the tool tailors its outputs. You can change this later.
        </p>
        <div className="grid gap-3">
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                mode === opt.value
                  ? 'border-[#1B4B82] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => { setMode(opt.value); setErrors((p) => { const n = { ...p }; delete n.mode; return n; }); }}
                className="mt-1 accent-[#1B4B82]"
              />
              <div>
                <span className="text-sm font-semibold text-[#0F1B2D]">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.mode && <p className="text-xs text-red-500 mt-2">{errors.mode}</p>}
      </section>

      {/* Operator role */}
      <section className={cardClass}>
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          1 &middot; Operator Role
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Your role determines which obligations apply. Most organisations using third-party AI are deployers.
        </p>
        <div className="space-y-2">
          {OPERATOR_ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                operatorRole === r.value ? 'border-[#1B4B82] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="operatorRole"
                value={r.value}
                checked={operatorRole === r.value}
                onChange={() => { setOperatorRole(r.value); setErrors((p) => { const n = { ...p }; delete n.operatorRole; return n; }); }}
                className="mt-0.5 accent-[#1B4B82]"
              />
              <span className="text-sm text-[#0F1B2D]">{r.label}</span>
            </label>
          ))}
        </div>
        {errors.operatorRole && <p className="text-xs text-red-500 mt-2">{errors.operatorRole}</p>}

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#0F1B2D] mb-1">GPAI role (if any)</label>
          <select
            value={gpaiRole}
            onChange={(e) => setGpaiRole(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#1B4B82]/40 focus:border-[#1B4B82]"
          >
            {GPAI_ROLES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* EU nexus */}
      <section className={cardClass}>
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          2 &middot; EU Nexus
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          The AI Act applies when the system or its outputs touch the EU. Select all that apply.
        </p>
        <div className="space-y-2">
          {[
            { key: 'placedOnEUMarket', label: 'AI system is placed on the EU market' },
            { key: 'usedInEU', label: 'AI system is put into service or used within the EU' },
            { key: 'outputAffectsEUPersons', label: 'Output of the AI system is used in the EU (affects EU persons)' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={!!euNexus[item.key]}
                onChange={() => { toggleNexus(item.key); setErrors((p) => { const n = { ...p }; delete n.euNexus; return n; }); }}
                className="accent-[#1B4B82]"
              />
              <span className="text-sm text-[#0F1B2D]">{item.label}</span>
            </label>
          ))}
        </div>
        {errors.euNexus && <p className="text-xs text-red-500 mt-2">{errors.euNexus}</p>}
      </section>

      {/* Risk domain flags */}
      <section className={cardClass}>
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          3 &middot; Risk Domain Flags
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Select any high-risk use areas that apply. These pre-populate Annex III classification questions.
        </p>
        <div className="flex flex-wrap gap-2">
          {RISK_DOMAINS.map((d) => {
            const selected = riskDomains.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDomain(d.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-[#1B4B82] text-white border-[#1B4B82]'
                    : 'bg-white text-[#0F1B2D] border-gray-300 hover:border-[#1B4B82]/50'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end pb-4">
        <button
          type="submit"
          data-testid="scope-wizard-submit"
          className="px-6 py-2.5 rounded bg-[#1B4B82] text-white text-sm font-semibold shadow hover:bg-[#163d6a] focus:outline-none focus:ring-2 focus:ring-[#1B4B82]/50 focus:ring-offset-2 transition-colors"
        >
          Continue to System Registration
        </button>
      </div>
    </form>
  );
}
