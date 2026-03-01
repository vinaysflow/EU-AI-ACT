export const BUSINESS_LINES = [
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

const BUSINESS_LINE_LABELS = Object.fromEntries(
  BUSINESS_LINES.map((line) => [line.value, line.label]),
);

const BASELINE_GUIDANCE = {
  clause_art4: {
    title: 'AI Literacy — baseline evidence',
    prompt:
      'Summarise the AI literacy programme, including role-based training, onboarding, refresh cadence, and completion tracking.',
    suggestedEvidence: [
      'Training policy approved by leadership',
      'Role-based curriculum and completion records',
      'Annual refresher and onboarding module',
    ],
  },
  clause_art26_1: {
    title: 'Use per Instructions — baseline evidence',
    prompt:
      'Describe how provider instructions are embedded into operational procedures and how updates are managed.',
    suggestedEvidence: [
      'Operational procedures referencing provider instructions',
      'Change management and version control evidence',
      'Staff acknowledgement of instruction requirements',
    ],
  },
  clause_art26_2: {
    title: 'Human Oversight — baseline evidence',
    prompt:
      'Identify the oversight roles, competence requirements, escalation paths, and authority to suspend use.',
    suggestedEvidence: [
      'Oversight charter or governance policy',
      'Role description with competence requirements',
      'Training records and escalation protocol',
    ],
  },
  clause_art26_4: {
    title: 'Input Data Quality — baseline evidence',
    prompt:
      'Explain how input data relevance and representativeness are assured, monitored, and corrected.',
    suggestedEvidence: [
      'Input data quality policy',
      'Relevance/representativeness assessment',
      'Monitoring and remediation procedures',
    ],
  },
  clause_art26_5: {
    title: 'Monitoring & Incident Reporting — baseline evidence',
    prompt:
      'Describe monitoring, incident detection, escalation, and reporting obligations with timelines.',
    suggestedEvidence: [
      'Monitoring framework aligned to instructions',
      'Incident reporting procedure and authority protocol',
      'Serious incident response plan',
    ],
  },
  clause_art26_6: {
    title: 'Log Retention — baseline evidence',
    prompt:
      'Detail log retention periods, storage controls, integrity checks, and alignment to sector record-keeping rules.',
    suggestedEvidence: [
      'Log retention policy (>= 6 months)',
      'Technical architecture for log storage',
      'Integrity verification procedure',
    ],
  },
  clause_art26_7: {
    title: 'Worker Notification — baseline evidence',
    prompt:
      'Describe how workers and representatives are notified before workplace deployment, including consultation steps.',
    suggestedEvidence: [
      'Worker notification record',
      'Works council or representative consultation evidence',
      'Worker information notice',
    ],
  },
  clause_art26_9: {
    title: 'GDPR DPIA Bridge — baseline evidence',
    prompt:
      'Show how Article 13 transparency information is used in DPIAs, and how records and approvals are updated.',
    suggestedEvidence: [
      'DPIA referencing provider transparency info',
      'Updated records of processing activities',
      'DPO sign-off documentation',
    ],
  },
  clause_art26_11: {
    title: 'Affected Persons Transparency — baseline evidence',
    prompt:
      'Explain how affected persons are informed of AI-assisted decisions and how communications are recorded.',
    suggestedEvidence: [
      'Transparency notice templates',
      'Notification channels and delivery records',
      'Audit trail of communications',
    ],
  },
  clause_art27_1: {
    title: 'Fundamental Rights Impact Assessment — baseline evidence',
    prompt:
      'Provide the FRIA scope, methodology, findings, governance measures, and any authority notification.',
    suggestedEvidence: [
      'Completed FRIA document',
      'Risk mitigation and governance measures',
      'Authority notification evidence (if required)',
    ],
  },
};

const LINE_PROMPT_TEMPLATES = {
  clause_art4: (label) =>
    `For ${label}, describe role-specific AI literacy coverage for teams operating or relying on the system.`,
  clause_art26_1: (label) =>
    `For ${label}, explain how provider instructions map to ${label} operating procedures and controls.`,
  clause_art26_2: (label) =>
    `For ${label}, specify oversight roles and escalation paths tailored to ${label} decision impacts.`,
  clause_art26_4: (label) =>
    `For ${label}, document how input data relevance and representativeness are validated for ${label} use cases.`,
  clause_art26_5: (label) =>
    `For ${label}, outline monitoring thresholds and incident reporting routes aligned to ${label} regulatory expectations.`,
  clause_art26_6: (label) =>
    `For ${label}, confirm log retention periods and alignment with ${label} record-keeping requirements.`,
  clause_art26_7: (label) =>
    `For ${label}, describe worker notification and consultation steps for workplace deployments.`,
  clause_art26_9: (label) =>
    `For ${label}, show how DPIA coverage reflects ${label} data processing risks and transparency inputs.`,
  clause_art26_11: (label) =>
    `For ${label}, explain transparency communications to affected persons in ${label} contexts.`,
  clause_art27_1: (label) =>
    `For ${label}, document FRIA scope and governance measures specific to ${label} deployment risks.`,
};

export const PROOF_PROMPTS = {
  clause_art4: [
    'Show the board or leadership approval record for the AI literacy policy.',
    'Provide completion rates for role-based training by department in the last 12 months.',
    'Share the most recent annual refresher assessment results.',
    'Demonstrate how new joiners receive AI literacy onboarding within 30 days of start.',
  ],
  clause_art26_1: [
    'Produce the internal SOP that explicitly references the provider\'s instructions for use, section by section.',
    'Show the change log demonstrating how the latest provider instruction update was incorporated.',
    'Provide a signed staff acknowledgement sheet from the last quarter.',
    'Share a recent internal audit or compliance review against provider instructions.',
  ],
  clause_art26_2: [
    'Name the human oversight person and provide their job description with AI oversight duties.',
    'Show override logs: at least one instance where the oversight person intervened on AI output.',
    'Provide the escalation policy with defined response times and authority matrix.',
    'Share the training/competence record for the current oversight person.',
  ],
  clause_art26_4: [
    'Produce the input data quality policy with explicit relevance and representativeness criteria.',
    'Show a completed data representativeness assessment for the current production dataset.',
    'Provide drift detection reports from the last 3 months.',
    'Demonstrate the data correction workflow with a recent remediation example.',
  ],
  clause_art26_5: [
    'Show the internal monitoring dashboard or report from the last reporting period.',
    'Provide a completed incident report (redacted) demonstrating the detection-to-notification workflow.',
    'Show the market surveillance authority notification template and contact details.',
    'Produce the serious incident response plan with named roles and response times.',
  ],
  clause_art26_6: [
    'Provide the log retention policy specifying the minimum retention period.',
    'Show a technical architecture diagram of log storage with access controls.',
    'Demonstrate a log integrity verification check from the last quarter.',
    'For financial services: show alignment mapping between AI logs and existing record-keeping requirements.',
  ],
  clause_art26_7: [
    'Produce the worker notification record with dates and recipient acknowledgements.',
    'Show minutes or records from works council / worker representative consultation.',
    'Provide the worker information document describing the AI system and its impact.',
  ],
  clause_art26_9: [
    'Show the DPIA that explicitly references Article 13 transparency information from the provider.',
    'Provide updated records of processing activities reflecting AI system data flows.',
    'Show the privacy impact assessment covering AI-specific risks.',
    'Produce the DPO sign-off record for AI system data processing.',
  ],
  clause_art26_11: [
    'Provide the transparency notice template sent to affected persons.',
    'Show the communication channel and delivery mechanism used for disclosure.',
    'Produce audit trail records showing transparency notices were actually delivered.',
  ],
  clause_art27_1: [
    'Produce the completed FRIA document covering Art. 27(1)(a)-(f) elements.',
    'Show the identified categories of affected natural persons and groups.',
    'Provide documented risk mitigation and governance measures.',
    'Show evidence of national authority notification (if applicable).',
  ],
};

export function getProofPrompts(clauseRef) {
  return PROOF_PROMPTS[clauseRef] || [];
}

export function getLineGuidance(clauseRef, businessLine) {
  const baseline = BASELINE_GUIDANCE[clauseRef];
  if (!baseline) return null;

  const label = BUSINESS_LINE_LABELS[businessLine];
  const template = LINE_PROMPT_TEMPLATES[clauseRef];
  if (!label || !template) return { ...baseline, businessLineLabel: null };

  return {
    ...baseline,
    businessLineLabel: label,
    title: `${baseline.title} — ${label}`,
    prompt: template(label),
  };
}
