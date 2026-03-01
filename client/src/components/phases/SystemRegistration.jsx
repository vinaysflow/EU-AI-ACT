import { useState, useCallback, useMemo } from 'react';

// ─── Inline Sub-components ──────────────────────────────────────────────────

function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-[#1B4B82] text-white text-[10px] font-semibold leading-none flex items-center justify-center cursor-help focus:outline-none focus:ring-2 focus:ring-[#1B4B82]/40"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="More information"
      >
        ?
      </button>
      {visible && (
        <span className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded bg-[#0F1B2D] text-white text-xs leading-relaxed shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F1B2D]" />
        </span>
      )}
    </span>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  required,
  value,
  onChange,
  error,
  helper,
  tooltip,
  placeholder,
  options,
  minLength,
  rows = 3,
  children,
}) {
  const id = `sr-${name}`;
  const baseInput =
    'w-full rounded border px-3 py-2 text-sm text-[#0F1B2D] bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4B82]/40 focus:border-[#1B4B82] transition-colors';
  const borderClass = error ? 'border-red-400' : 'border-gray-300';

  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-[#0F1B2D] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>

      {helper && (
        <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">{helper}</p>
      )}

      {children ? (
        children
      ) : type === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className={`${baseInput} ${borderClass}`}
        >
          <option value="">— Select —</option>
          {options.map((opt) => (
            <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <>
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className={`${baseInput} ${borderClass} resize-y`}
          />
          {minLength && (
            <p className={`text-xs mt-1 ${(value?.length || 0) >= minLength ? 'text-gray-400' : 'text-gray-500'}`}>
              {value?.length || 0} / {minLength} characters minimum
            </p>
          )}
        </>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${baseInput} ${borderClass}`}
        />
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

function ChipSelect({ label, name, options, value = [], onChange, error, required }) {
  const toggle = (chip) => {
    const next = value.includes(chip)
      ? value.filter((v) => v !== chip)
      : [...value, chip];
    onChange({ target: { name, value: next } });
  };

  return (
    <div className="mb-5">
      <span className="block text-sm font-medium text-[#0F1B2D] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map((chip) => {
          const selected = value.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? 'bg-[#1B4B82] text-white border-[#1B4B82]'
                  : 'bg-white text-[#0F1B2D] border-gray-300 hover:border-[#1B4B82]/50'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_TYPES = [
  { value: 'ml_statistical', label: 'Machine learning / statistical' },
  { value: 'rules_based', label: 'Rules-based / deterministic' },
  { value: 'hybrid', label: 'Hybrid (ML + rules)' },
  { value: 'unknown', label: 'Unknown / not yet determined' },
];

const DEPLOYMENT_CONTEXTS = [
  'Internal workflow',
  'Customer-facing',
  'Employee-facing',
  'AI-assisted human decision',
  'Automated decision (no human review)',
  'Other',
];

const DATA_TYPE_OPTIONS = [
  'Name/contact',
  'CV/professional history',
  'Biometric',
  'Financial',
  'Health/medical',
  'Location',
  'Behavioural/performance',
  'None',
];

const INPUT_DATA_CONTROLLERS = [
  'Our organisation',
  'End user',
  'AI vendor',
  'Third-party provider',
  'Mixed',
];

const PRIMARY_SECTORS = [
  'Retail banking/credit',
  'Insurance (life/health)',
  'Payments/acquirer',
  'Fintech',
  'HR tech',
  'Capital markets',
  'Asset management',
  'Other financial services',
  'Non-financial',
];

const BUSINESS_LINES = [
  { value: 'credit_lending', label: 'Credit and lending (Annex III 5b)' },
  { value: 'insurance', label: 'Insurance (Annex III 5c)' },
  { value: 'employment_hr', label: 'Employment and HR (Annex III 4)' },
  { value: 'education_training', label: 'Education and training (Annex III 3)' },
  { value: 'biometrics_identity', label: 'Biometrics and identity (Annex III 1)' },
  { value: 'critical_infrastructure', label: 'Critical infrastructure and utilities (Annex III 2)' },
  { value: 'law_enforcement', label: 'Law enforcement (Annex III 6)' },
  { value: 'migration_border', label: 'Migration and border control (Annex III 7)' },
  { value: 'justice_democratic', label: 'Justice and democratic processes (Annex III 8)' },
  { value: 'public_sector', label: 'Public sector services' },
  { value: 'healthcare_life_sciences', label: 'Healthcare and life sciences' },
  { value: 'payments_fintech', label: 'Payments and fintech' },
  { value: 'transport_mobility', label: 'Transportation and mobility' },
  { value: 'retail_ecommerce', label: 'Retail and e-commerce' },
  { value: 'marketing_advertising', label: 'Marketing and advertising' },
  { value: 'security_surveillance', label: 'Security and surveillance' },
  { value: 'other', label: 'Other / multi-industry' },
];

const PERSONS_AFFECTED = [
  { value: '<100', label: 'Fewer than 100' },
  { value: '100-1,000', label: '100 – 1,000' },
  { value: '1,000-10,000', label: '1,000 – 10,000' },
  { value: '10,000-100,000', label: '10,000 – 100,000' },
  { value: '100,000+', label: '100,000+' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
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

function buildInitial(system) {
  return {
    name: system?.name ?? '',
    vendor: system?.vendor ?? '',
    modelVersion: system?.modelVersion ?? '',
    systemType: system?.systemType ?? '',
    intendedPurpose: system?.intendedPurpose ?? '',
    providerStatedPurpose: system?.providerStatedPurpose ?? '',
    howOutputsUsed: system?.howOutputsUsed ?? '',
    deploymentContext: system?.deploymentContext ?? '',
    operatedBy: system?.operatedBy ?? '',
    oversightRole: system?.oversightRole ?? '',
    affectedPersons: system?.affectedPersons ?? '',
    dataTypes: system?.dataTypes ?? [],
    inputDataController: system?.inputDataController ?? '',
    primarySector: system?.primarySector ?? '',
    businessLine: system?.businessLine ?? '',
    personsAffectedPerMonth: system?.personsAffectedPerMonth ?? '',
    affectsEuResidents: system?.affectsEuResidents ?? '',
  };
}

export default function SystemRegistration({ assessmentState, dispatch, onComplete, guidance }) {
  const [form, setForm] = useState(() => buildInitial(assessmentState?.system));
  const [errors, setErrors] = useState({});
  const hintMap = useMemo(
    () => Object.fromEntries((guidance?.contextualHints || []).map((hint) => [hint.fieldId, hint.text])),
    [guidance],
  );
  const mergeHelper = (base, hint) => (hint ? (base ? `${base} ${hint}` : hint) : base);
  const callout = guidance?.nextBestActions?.[0];

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const next = {};
    for (const key of REQUIRED_FIELDS) {
      const val = form[key];
      if (Array.isArray(val) ? val.length === 0 : !val?.trim()) {
        next[key] = 'This field is required';
      }
    }
    if (form.intendedPurpose && form.intendedPurpose.trim().length < 100) {
      next.intendedPurpose = 'Please provide at least 100 characters describing the intended purpose';
    }
    return next;
  }, [form]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    dispatch({ type: 'SET_SYSTEM', payload: form });
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  const sectionHeading = 'font-serif text-lg font-bold text-[#0F1B2D] mb-1';

  return (
    <form onSubmit={handleSubmit} data-testid="registration-form" className="max-w-3xl mx-auto space-y-8">
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
      {/* ── Section 1: System Identity & Purpose ─────────────────────── */}
      <section data-testid="section-identity" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          1 &middot; System Identity &amp; Purpose
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Describe the AI system under assessment. Precise answers improve classification accuracy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <FormField
            label="System name"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g. Automated CV Screener"
          />
          <FormField
            label="Vendor / provider"
            name="vendor"
            required
            value={form.vendor}
            onChange={handleChange}
            error={errors.vendor}
            placeholder="e.g. Workday Inc."
          />
        </div>

        <FormField
          label="Model / version identifier"
          name="modelVersion"
          required
          value={form.modelVersion}
          onChange={handleChange}
          error={errors.modelVersion}
          placeholder="e.g. Workday AI Recruiting 3.2"
          tooltip="Be specific: 'Workday AI Recruiting 3.2', not 'our HR system'"
        />

        <FormField
          label="System type"
          name="systemType"
          type="select"
          required
          value={form.systemType}
          onChange={handleChange}
          error={errors.systemType}
          options={SYSTEM_TYPES}
          helper={mergeHelper('How does the system produce its outputs?', hintMap.systemType)}
        />

        <FormField
          label="Intended purpose"
          name="intendedPurpose"
          type="textarea"
          required
          rows={4}
          minLength={100}
          value={form.intendedPurpose}
          onChange={handleChange}
          error={errors.intendedPurpose}
          helper={mergeHelper(null, hintMap.intendedPurpose)}
          placeholder="Describe what the system is designed to do and the decisions it supports…"
        />

        <FormField
          label="Provider-stated purpose"
          name="providerStatedPurpose"
          type="textarea"
          value={form.providerStatedPurpose}
          onChange={handleChange}
          error={errors.providerStatedPurpose}
          helper="Copy the vendor's own description of the system's purpose, if available."
          placeholder="Paste from vendor documentation…"
        />

        <FormField
          label="How are outputs used?"
          name="howOutputsUsed"
          type="textarea"
          required
          value={form.howOutputsUsed}
          onChange={handleChange}
          error={errors.howOutputsUsed}
          helper="Explain how the AI system's outputs feed into decisions—are they advisory, determinative, or somewhere in between?"
          placeholder="e.g. Scores are reviewed by a recruiter before any shortlisting decision…"
        />

        <FormField
          label="Deployment context"
          name="deploymentContext"
          type="select"
          required
          value={form.deploymentContext}
          onChange={handleChange}
          error={errors.deploymentContext}
          options={DEPLOYMENT_CONTEXTS}
        />
      </section>

      {/* ── Section 2: People, Data & Role ────────────────────────────── */}
      <section data-testid="section-people-data" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          2 &middot; People, Data &amp; Role
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Identify who operates, oversees, and is affected by the system, and what data it processes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <FormField
            label="Operated by"
            name="operatedBy"
            value={form.operatedBy}
            onChange={handleChange}
            error={errors.operatedBy}
            placeholder="e.g. HR Operations team"
          />
          <FormField
            label="Human oversight role"
            name="oversightRole"
            value={form.oversightRole}
            onChange={handleChange}
            error={errors.oversightRole}
            helper="Who reviews or can override the system's outputs?"
            placeholder="e.g. Senior Recruiter"
          />
        </div>

        <FormField
          label="Affected persons"
          name="affectedPersons"
          type="textarea"
          required
          value={form.affectedPersons}
          onChange={handleChange}
          error={errors.affectedPersons}
          placeholder="e.g. Job applicants to our EU offices, including EU/EEA residents"
        />

        <ChipSelect
          label="Data types processed"
          name="dataTypes"
          options={DATA_TYPE_OPTIONS}
          value={form.dataTypes}
          onChange={handleChange}
          error={errors.dataTypes}
        />

        <FormField
          label="Input data controller"
          name="inputDataController"
          type="select"
          required
          value={form.inputDataController}
          onChange={handleChange}
          error={errors.inputDataController}
          options={INPUT_DATA_CONTROLLERS}
          helper={mergeHelper(null, hintMap.inputDataController)}
        />
      </section>

      {/* ── Section 3: Sector & Scale ─────────────────────────────────── */}
      <section data-testid="section-sector-scale" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className={sectionHeading} style={{ fontFamily: 'Georgia, serif' }}>
          3 &middot; Sector &amp; Scale
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Context for determining regulatory obligations and proportionality.
        </p>

        <FormField
          label="Primary sector"
          name="primarySector"
          type="select"
          required
          value={form.primarySector}
          onChange={handleChange}
          error={errors.primarySector}
          options={PRIMARY_SECTORS}
        />

        <FormField
          label="Primary business line"
          name="businessLine"
          type="select"
          required
          value={form.businessLine}
          onChange={handleChange}
          error={errors.businessLine}
          options={BUSINESS_LINES}
          helper="Select the business line most impacted by this AI system."
        />

        <FormField
          label="Persons affected per month"
          name="personsAffectedPerMonth"
          type="select"
          value={form.personsAffectedPerMonth}
          onChange={handleChange}
          error={errors.personsAffectedPerMonth}
          options={PERSONS_AFFECTED}
        />

        <div className="mb-5">
          <span className="block text-sm font-medium text-[#0F1B2D] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Affects EU/EEA residents?<span className="text-red-500 ml-0.5">*</span>
          </span>
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            {mergeHelper(
              "The AI Act applies when an AI system's output affects natural persons located in the EU, regardless of where the provider or deployer is established.",
              hintMap.affectsEuResidents,
            )}
          </p>
          <div className="flex items-center gap-6">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-sm text-[#0F1B2D]">
                <input
                  type="radio"
                  name="affectsEuResidents"
                  value={val}
                  checked={form.affectsEuResidents === val}
                  onChange={handleChange}
                  className="accent-[#1B4B82]"
                />
                {val === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
          {errors.affectsEuResidents && (
            <p className="text-xs text-red-500 mt-1">{errors.affectsEuResidents}</p>
          )}
        </div>
      </section>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <button
          type="submit"
          data-testid="registration-submit"
          className="px-6 py-2.5 rounded bg-[#1B4B82] text-white text-sm font-semibold shadow hover:bg-[#163d6a] focus:outline-none focus:ring-2 focus:ring-[#1B4B82]/50 focus:ring-offset-2 transition-colors"
        >
          Save &amp; Continue
        </button>
      </div>
    </form>
  );
}
