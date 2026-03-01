import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

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

const BUSINESS_LINE_LABELS = Object.fromEntries(
  BUSINESS_LINES.map((line) => [line.value, line.label]),
);

const BUSINESS_LINE_SETS = {
  all: BUSINESS_LINES.map((b) => b.value),
  workplace: [
    'employment_hr',
    'public_sector',
    'education_training',
    'healthcare_life_sciences',
    'retail_ecommerce',
    'transport_mobility',
    'critical_infrastructure',
    'security_surveillance',
    'law_enforcement',
    'other',
  ],
  fria: [
    'public_sector',
    'credit_lending',
    'insurance',
  ],
};

const CLAUSE_LINE_SET = {
  clause_art26_7: 'workplace',
  clause_art27_1: 'fria',
};

const ARTEFACT_LINE_OVERRIDES = {
  ea_art26_6_3: ['credit_lending', 'insurance', 'payments_fintech'],
};

const BASELINE_PROMPTS = {
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

const BASELINE_CRITERIA = {
  clause_art4: ['AI literacy policy exists', 'Role-based training tracked', 'Annual refresh cadence documented'],
  clause_art26_1: ['Provider instructions embedded in procedures', 'Change control tracked', 'Staff acknowledgement recorded'],
  clause_art26_2: ['Named oversight role', 'Competence requirements documented', 'Escalation authority defined'],
  clause_art26_4: ['Input data quality standards defined', 'Representativeness assessed', 'Monitoring and correction in place'],
  clause_art26_5: ['Monitoring procedures defined', 'Incident reporting workflow documented', 'Authority notification steps clear'],
  clause_art26_6: ['Retention period >= 6 months', 'Storage controls documented', 'Integrity verification in place'],
  clause_art26_7: ['Worker notification documented', 'Representative consultation evidenced', 'Information notice delivered'],
  clause_art26_9: ['DPIA references AI transparency info', 'Records of processing updated', 'DPO sign-off documented'],
  clause_art26_11: ['Transparency notice exists', 'Communication channel defined', 'Delivery evidence retained'],
  clause_art27_1: ['FRIA completed before deployment', 'Governance measures documented', 'Authority notification recorded if required'],
};

function buildEvidencePrompts(clause) {
  const baseline = BASELINE_PROMPTS[clause.id];
  const lineTemplate = LINE_PROMPT_TEMPLATES[clause.id];
  const prompts = [];

  if (baseline) {
    prompts.push({
      id: `${clause.id}_baseline`,
      title: baseline.title,
      prompt: baseline.prompt,
      suggestedEvidence: baseline.suggestedEvidence,
      businessLines: BUSINESS_LINE_SETS.all,
    });
  }

  if (lineTemplate) {
    for (const line of BUSINESS_LINES) {
      prompts.push({
        id: `${clause.id}_${line.value}`,
        title: `${clause.obligation_title} — ${line.label}`,
        prompt: lineTemplate(line.label),
        suggestedEvidence: baseline?.suggestedEvidence || [],
        businessLines: [line.value],
      });
    }
  }

  return prompts;
}

function buildEvaluationCriteria(clause) {
  const baseline = BASELINE_CRITERIA[clause.id] || [];
  const byBusinessLine = {};
  for (const line of BUSINESS_LINES) {
    byBusinessLine[line.value] = {
      checks: [
        ...baseline,
        `Controls reflect ${line.label} workflows and stakeholders`,
      ],
      evidenceFocus: [
        `Policies or procedures referencing ${line.label} operations`,
        `Evidence owners accountable for ${line.label} compliance`,
      ],
    };
  }
  return {
    baseline,
    byBusinessLine,
  };
}

const CLAUSES = [
  {
    id: 'clause_art4',
    article_ref: 'Article 4',
    obligation_title: 'AI Literacy',
    plain_language: 'Your organisation must train staff and anyone using AI systems on your behalf so they understand AI well enough for their role, considering their background and who the AI affects.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art4_1',
        name: 'Board-Approved AI Training Policy',
        description: 'Organisation-wide policy mandating AI literacy training for all staff interacting with AI systems',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art4',
        requiredFor: ['clause_art4'],
        alsoSatisfies: ['clause_art26_2'],
        matchTerms: [
          'ai training policy', 'ai literacy policy', 'board approved training',
          'ai literacy programme', 'ai awareness programme', 'ai training framework',
          'mandatory ai training', 'ai education policy', 'ai competency policy',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art4_2',
        name: 'Role-Based Training Curriculum',
        description: 'Training curriculum differentiated by role with completion tracking and assessment records',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art4',
        requiredFor: ['clause_art4'],
        alsoSatisfies: [],
        matchTerms: [
          'role based training', 'training curriculum', 'completion tracking',
          'training matrix', 'role specific training', 'training programme',
          'competency framework', 'learning pathway', 'training assessment',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'],
      },
      {
        id: 'ea_art4_3',
        name: 'Annual Refresher Programme',
        description: 'Annual refresher training with assessment to maintain AI literacy currency',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art4',
        requiredFor: ['clause_art4'],
        alsoSatisfies: [],
        matchTerms: [
          'annual refresher', 'refresher programme', 'refresher training',
          'annual assessment', 'periodic training', 'recurrent training',
          'annual review', 'yearly refresher', 'ongoing training',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'not yet', 'to be developed'],
      },
      {
        id: 'ea_art4_4',
        name: 'Onboarding AI Literacy Module',
        description: 'AI literacy module integrated into new joiner onboarding process',
        tier: 2,
        required: false,
        gdpr_link: null,
        archetype_id: 'aia_art4',
        requiredFor: ['clause_art4'],
        alsoSatisfies: [],
        matchTerms: [
          'onboarding module', 'new joiner training', 'induction training',
          'onboarding ai', 'new starter training', 'induction programme',
          'onboarding programme', 'joining programme',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
    ],
  },
  {
    id: 'clause_art26_1',
    article_ref: 'Article 26(1)',
    obligation_title: 'Use per Instructions',
    plain_language: 'You must use the high-risk AI system according to the provider\u2019s instructions for use, with appropriate technical and organisational measures in place.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_1_1',
        name: 'Operational Procedures Referencing Provider Instructions',
        description: 'Documented operational procedures explicitly referencing the provider\'s instructions for use',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_1',
        requiredFor: ['clause_art26_1'],
        alsoSatisfies: ['clause_art26_5'],
        matchTerms: [
          'operational procedures', 'provider instructions', 'instructions for use',
          'standard operating procedure', 'usage procedures', 'operating manual',
          'operational guidelines', 'usage protocol', 'operating procedure',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_1_2',
        name: 'Change Management Process for Instruction Updates',
        description: 'Process ensuring operational procedures are updated when provider instructions change',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_1',
        requiredFor: ['clause_art26_1'],
        alsoSatisfies: [],
        matchTerms: [
          'change management', 'instruction updates', 'version control',
          'change control process', 'update procedure', 'revision management',
          'change management process', 'configuration management',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'],
      },
      {
        id: 'ea_art26_1_3',
        name: 'Staff Acknowledgement of Instruction Requirements',
        description: 'Evidence that relevant staff have read and acknowledged the AI system instructions for use',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_1',
        requiredFor: ['clause_art26_1'],
        alsoSatisfies: ['clause_art4'],
        matchTerms: [
          'staff acknowledgement', 'instruction acknowledgement', 'sign off',
          'staff sign off', 'acknowledged instructions', 'read and understood',
          'user acknowledgement', 'operator acknowledgement',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'not yet signed'],
      },
      {
        id: 'ea_art26_1_4',
        name: 'Periodic Compliance Review Against Provider Instructions',
        description: 'Regular review confirming actual use remains aligned with provider instructions',
        tier: 2,
        required: false,
        gdpr_link: null,
        archetype_id: 'aia_art26_1',
        requiredFor: ['clause_art26_1'],
        alsoSatisfies: [],
        matchTerms: [
          'periodic review', 'compliance review', 'periodic compliance',
          'regular review', 'usage audit', 'instruction compliance review',
          'annual compliance review', 'quarterly review',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be scheduled'],
      },
    ],
  },
  {
    id: 'clause_art26_2',
    article_ref: 'Article 26(2)',
    obligation_title: 'Human Oversight',
    plain_language: 'You must assign human oversight to people who have the right skills, training, authority, and support to oversee the AI system effectively.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_2_1',
        name: 'AI Oversight Charter / Governance Policy',
        description: 'Named document assigning oversight responsibility with authority to suspend use',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_2',
        requiredFor: ['clause_art26_2'],
        alsoSatisfies: ['clause_art26_5'],
        matchTerms: [
          'oversight charter', 'governance policy', 'oversight policy', 'ai governance',
          'oversight role', 'named responsible', 'suspend use', 'oversight mandate',
        ],
        negativeTerms: ['draft', 'tbd', 'todo', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_2_2',
        name: 'Role Description — AI Oversight Person',
        description: 'Job description naming specific AI oversight duties',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_2',
        requiredFor: ['clause_art26_2'],
        alsoSatisfies: [],
        matchTerms: [
          'role description', 'job description', 'oversight person', 'oversight role',
          'oversight duties', 'responsible person', 'named person', 'oversight function',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
      {
        id: 'ea_art26_2_3',
        name: 'Competence / Training Record',
        description: 'Evidence of technical training and competence assessment for the oversight role',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_2',
        requiredFor: ['clause_art26_2'],
        alsoSatisfies: ['clause_art4'],
        matchTerms: [
          'training record', 'competence assessment', 'training completion', 'certified',
          'training programme', 'completed training', 'ai literacy', 'oversight training',
        ],
        negativeTerms: ['draft', 'planned', 'to be completed', 'not yet', 'tbd'],
      },
      {
        id: 'ea_art26_2_4',
        name: 'Escalation and Suspension Protocol',
        description: 'Documented authority and procedure for the oversight person to suspend AI use',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_2',
        requiredFor: ['clause_art26_2'],
        alsoSatisfies: ['clause_art26_5'],
        matchTerms: [
          'escalation protocol', 'suspension protocol', 'suspend use', 'escalation procedure',
          'authority to suspend', 'pause deployment', 'incident escalation',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
    ],
  },
  {
    id: 'clause_art26_4',
    article_ref: 'Article 26(4)',
    obligation_title: 'Input Data Quality',
    plain_language: 'If you control the input data fed into the AI system, you must ensure it is relevant and representative for the system\u2019s intended purpose.',
    applies_conditions: {
      logic: 'OR',
      required: [
        { field: 'system.inputDataController', op: 'eq', value: 'Our organisation' },
        { field: 'system.inputDataController', op: 'eq', value: 'Mixed' },
      ],
      notApplicableBasis: 'Art. 26(4) applies only where the deployer controls the input data.',
      notApplicableCitation: 'Article 26(4)',
    },
    evidence_artefacts: [
      {
        id: 'ea_art26_4_1',
        name: 'Input Data Quality Policy',
        description: 'Policy defining data quality standards, relevance criteria, and representativeness requirements for AI input data',
        tier: 1,
        required: true,
        gdpr_link: 'Article 5(1)(d) GDPR — accuracy',
        archetype_id: null,
        requiredFor: ['clause_art26_4'],
        alsoSatisfies: [],
        matchTerms: [
          'data quality policy', 'input data quality', 'data quality standards',
          'data quality framework', 'data governance policy', 'data quality requirements',
          'data accuracy policy', 'data representativeness',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'to be developed'],
      },
      {
        id: 'ea_art26_4_2',
        name: 'Data Relevance and Representativeness Assessment',
        description: 'Documented assessment confirming input data is relevant and representative for the system intended purpose',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_4'],
        alsoSatisfies: ['clause_art26_9'],
        matchTerms: [
          'relevance assessment', 'representativeness assessment', 'data assessment',
          'data suitability assessment', 'data fitness assessment', 'bias assessment',
          'data representativeness review', 'intended purpose data assessment',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be completed', 'forthcoming'],
      },
      {
        id: 'ea_art26_4_3',
        name: 'Data Monitoring and Drift Detection Procedure',
        description: 'Procedure for ongoing monitoring of input data quality and detecting drift from training distribution',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_4'],
        alsoSatisfies: ['clause_art26_5'],
        matchTerms: [
          'data monitoring', 'drift detection', 'data drift', 'monitoring procedure',
          'data quality monitoring', 'distribution drift', 'ongoing data monitoring',
          'input monitoring', 'data pipeline monitoring',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'not yet implemented'],
      },
      {
        id: 'ea_art26_4_4',
        name: 'Data Correction and Remediation Process',
        description: 'Process for correcting or remediating input data quality issues when identified',
        tier: 2,
        required: false,
        gdpr_link: 'Article 16 GDPR — right to rectification',
        archetype_id: null,
        requiredFor: ['clause_art26_4'],
        alsoSatisfies: [],
        matchTerms: [
          'data correction', 'data remediation', 'correction process',
          'data cleansing procedure', 'data rectification', 'quality remediation',
          'data issue resolution', 'data correction procedure',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
    ],
  },
  {
    id: 'clause_art26_5',
    article_ref: 'Article 26(5)',
    obligation_title: 'Monitoring & Incident Reporting',
    plain_language: 'You must monitor the AI system per the instructions, report risks to providers and authorities without delay, and suspend the system if it presents a risk. Serious incidents require immediate notification.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_5_1',
        name: 'Internal Monitoring Framework',
        description: 'Framework for monitoring AI system operation aligned with provider instructions for use',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_5',
        requiredFor: ['clause_art26_5'],
        alsoSatisfies: ['clause_art26_1'],
        matchTerms: [
          'monitoring framework', 'internal monitoring', 'monitoring procedure',
          'operational monitoring', 'system monitoring', 'performance monitoring',
          'ai monitoring framework', 'continuous monitoring',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_5_2',
        name: 'Incident Detection and Reporting Procedure',
        description: 'Procedure for detecting AI-related incidents and reporting to provider and market surveillance authority',
        tier: 1,
        required: true,
        gdpr_link: 'Article 33 GDPR — notification of breach',
        archetype_id: 'aia_art26_5',
        requiredFor: ['clause_art26_5'],
        alsoSatisfies: [],
        matchTerms: [
          'incident detection', 'incident reporting', 'reporting procedure',
          'incident management', 'serious incident', 'incident response',
          'market surveillance notification', 'incident reporting protocol',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'],
      },
      {
        id: 'ea_art26_5_3',
        name: 'Market Surveillance Authority Notification Protocol',
        description: 'Protocol for notifying the relevant market surveillance authority of AI system risks or serious incidents',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_5',
        requiredFor: ['clause_art26_5'],
        alsoSatisfies: [],
        matchTerms: [
          'market surveillance', 'authority notification', 'surveillance authority',
          'regulatory notification', 'notify authority', 'authority reporting',
          'competent authority notification', 'market surveillance protocol',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
      {
        id: 'ea_art26_5_4',
        name: 'Serious Incident Response Plan',
        description: 'Documented plan for responding to serious incidents including suspension, notification, and remediation steps',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_5',
        requiredFor: ['clause_art26_5'],
        alsoSatisfies: ['clause_art26_2'],
        matchTerms: [
          'incident response plan', 'serious incident response', 'response plan',
          'incident response procedure', 'emergency response', 'crisis management',
          'incident management plan', 'business continuity',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be developed', 'forthcoming'],
      },
    ],
  },
  {
    id: 'clause_art26_6',
    article_ref: 'Article 26(6)',
    obligation_title: 'Log Retention',
    plain_language: 'You must keep AI-generated logs for at least six months (or longer if required by other law). Financial institutions must maintain logs as part of their existing financial services documentation.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_6_1',
        name: 'Log Retention Policy',
        description: 'Policy specifying minimum six-month retention period for automatically generated AI system logs',
        tier: 1,
        required: true,
        gdpr_link: 'Article 5(1)(e) GDPR — storage limitation',
        archetype_id: 'aia_art26_6',
        requiredFor: ['clause_art26_6'],
        alsoSatisfies: [],
        matchTerms: [
          'log retention policy', 'retention policy', 'log retention period',
          'six month retention', 'log storage policy', 'data retention policy',
          'record retention', 'minimum retention period',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_6_2',
        name: 'Technical Architecture for Log Storage',
        description: 'Technical architecture showing log storage infrastructure, access controls, and retention enforcement',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_6',
        requiredFor: ['clause_art26_6'],
        alsoSatisfies: [],
        matchTerms: [
          'log storage architecture', 'technical architecture', 'storage infrastructure',
          'access controls', 'log management system', 'log infrastructure',
          'storage and access controls', 'log storage design',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'],
      },
      {
        id: 'ea_art26_6_3',
        name: 'Financial Services Record-Keeping Alignment',
        description: 'Evidence of alignment between AI log retention and existing financial services record-keeping requirements',
        tier: 2,
        required: false,
        gdpr_link: null,
        archetype_id: 'aia_art26_6',
        requiredFor: ['clause_art26_6'],
        alsoSatisfies: [],
        matchTerms: [
          'financial services record keeping', 'record keeping alignment',
          'regulatory record keeping', 'financial record retention',
          'mifid record keeping', 'financial services compliance', 'regulatory alignment',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
      {
        id: 'ea_art26_6_4',
        name: 'Log Integrity Verification Procedure',
        description: 'Procedure for verifying the integrity of stored logs to ensure they have not been tampered with',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: 'aia_art26_6',
        requiredFor: ['clause_art26_6'],
        alsoSatisfies: [],
        matchTerms: [
          'log integrity', 'integrity verification', 'tamper detection',
          'log verification procedure', 'integrity check', 'log audit trail',
          'immutable logs', 'log integrity check',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'not yet implemented'],
      },
    ],
  },
  {
    id: 'clause_art26_7',
    article_ref: 'Article 26(7)',
    obligation_title: 'Worker Notification',
    plain_language: 'Before using a high-risk AI system in the workplace, you must inform workers\u2019 representatives and affected workers that they will be subject to it.',
    applies_conditions: {
      logic: 'AND',
      required: [
        { field: 'system.deploymentContext', op: 'includes', value: 'employee' },
      ],
      notApplicableBasis: 'Art. 26(7) applies to deployers using AI in the workplace affecting workers.',
      notApplicableCitation: 'Article 26(7)',
    },
    evidence_artefacts: [
      {
        id: 'ea_art26_7_1',
        name: 'Worker Notification Record',
        description: 'Evidence that affected workers and workers\' representatives were notified before AI system deployment',
        tier: 1,
        required: true,
        gdpr_link: 'Articles 13-14 GDPR — information to data subjects',
        archetype_id: null,
        requiredFor: ['clause_art26_7'],
        alsoSatisfies: ['clause_art26_11'],
        matchTerms: [
          'worker notification', 'employee notification', 'staff notification',
          'workers informed', 'worker representatives notified', 'workforce notification',
          'employee communication', 'worker information notice',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be sent', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_7_2',
        name: 'Works Council / Worker Representative Consultation',
        description: 'Record of consultation with works council or workers\' representatives per national law',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_7'],
        alsoSatisfies: [],
        matchTerms: [
          'works council', 'worker representatives', 'representative consultation',
          'trade union consultation', 'employee representatives', 'staff consultation',
          'works council consultation', 'collective consultation',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be scheduled', 'pending consultation'],
      },
      {
        id: 'ea_art26_7_3',
        name: 'Worker Information Document',
        description: 'Clear information document provided to affected workers describing the AI system and its impact',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_7'],
        alsoSatisfies: ['clause_art26_11'],
        matchTerms: [
          'information document', 'worker information', 'employee information pack',
          'ai system description', 'worker briefing', 'information notice',
          'transparency notice', 'employee transparency document',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder'],
      },
    ],
  },
  {
    id: 'clause_art26_9',
    article_ref: 'Article 26(9)',
    obligation_title: 'GDPR DPIA Bridge',
    plain_language: 'Where applicable, use the transparency information provided by the AI system\u2019s provider to carry out your data protection impact assessment under the GDPR.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_9_1',
        name: 'DPIA Referencing Article 13 Transparency Information',
        description: 'Data protection impact assessment explicitly using the provider\'s Article 13 transparency information',
        tier: 1,
        required: true,
        gdpr_link: 'Article 35 GDPR — data protection impact assessment',
        archetype_id: 'aia_art26_9',
        requiredFor: ['clause_art26_9'],
        alsoSatisfies: ['clause_art27_1'],
        matchTerms: [
          'dpia', 'data protection impact assessment', 'article 13 transparency',
          'impact assessment', 'privacy impact assessment', 'dpia completed',
          'dpia referencing provider', 'data protection assessment',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_9_2',
        name: 'Data Processing Records Updated for AI',
        description: 'Records of processing activities updated to reflect AI system data flows and processing purposes',
        tier: 1,
        required: true,
        gdpr_link: 'Article 30 GDPR — records of processing activities',
        archetype_id: 'aia_art26_9',
        requiredFor: ['clause_art26_9'],
        alsoSatisfies: [],
        matchTerms: [
          'data processing records', 'processing activities', 'ropa updated',
          'record of processing', 'data flow mapping', 'processing records',
          'article 30 records', 'data processing register',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'planned', 'to be updated'],
      },
      {
        id: 'ea_art26_9_3',
        name: 'Privacy Impact Assessment Covering AI Risks',
        description: 'Privacy impact assessment specifically covering AI-specific risks including automated decision-making',
        tier: 2,
        required: true,
        gdpr_link: 'Article 22 GDPR — automated individual decision-making',
        archetype_id: 'aia_art26_9',
        requiredFor: ['clause_art26_9'],
        alsoSatisfies: ['clause_art27_1'],
        matchTerms: [
          'privacy impact assessment', 'ai risk assessment', 'ai specific risks',
          'automated decision making risk', 'privacy risk assessment', 'pia completed',
          'ai privacy assessment', 'algorithmic impact assessment',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be completed', 'forthcoming'],
      },
      {
        id: 'ea_art26_9_4',
        name: 'DPO Sign-Off on AI Data Processing',
        description: 'Data protection officer sign-off confirming AI system data processing activities are compliant',
        tier: 2,
        required: true,
        gdpr_link: 'Articles 37-39 GDPR — DPO role',
        archetype_id: 'aia_art26_9',
        requiredFor: ['clause_art26_9'],
        alsoSatisfies: [],
        matchTerms: [
          'dpo sign off', 'dpo approval', 'data protection officer',
          'dpo review', 'dpo sign-off', 'dpo confirmed', 'dpo endorsement',
          'data protection officer approval',
        ],
        negativeTerms: ['draft', 'tbd', 'pending sign off', 'awaiting dpo', 'to be signed'],
      },
    ],
  },
  {
    id: 'clause_art26_11',
    article_ref: 'Article 26(11)',
    obligation_title: 'Affected Persons Transparency',
    plain_language: 'You must inform individuals that they are subject to decisions made or assisted by a high-risk AI system listed in Annex III.',
    applies_conditions: null,
    evidence_artefacts: [
      {
        id: 'ea_art26_11_1',
        name: 'Transparency Notice for Affected Persons',
        description: 'Notice informing natural persons that they are subject to decisions made or assisted by a high-risk AI system',
        tier: 1,
        required: true,
        gdpr_link: 'Articles 13-14 GDPR — information to data subjects',
        archetype_id: null,
        requiredFor: ['clause_art26_11'],
        alsoSatisfies: [],
        matchTerms: [
          'transparency notice', 'affected persons notice', 'subject notification',
          'ai transparency notice', 'individual notification', 'person notification',
          'transparency disclosure', 'ai use disclosure',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art26_11_2',
        name: 'Communication Channel for AI Disclosure',
        description: 'Documented channel through which affected persons are informed of AI system use in decisions affecting them',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_11'],
        alsoSatisfies: [],
        matchTerms: [
          'communication channel', 'disclosure mechanism', 'notification channel',
          'information delivery', 'transparency mechanism', 'disclosure process',
          'communication process', 'notification method',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be established', 'forthcoming'],
      },
      {
        id: 'ea_art26_11_3',
        name: 'Record of Transparency Communications',
        description: 'Audit trail showing transparency notices were actually delivered to affected persons',
        tier: 2,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art26_11'],
        alsoSatisfies: ['clause_art26_7'],
        matchTerms: [
          'transparency record', 'communication record', 'notification record',
          'delivery record', 'audit trail', 'disclosure record',
          'communication log', 'notification log',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'not yet delivered'],
      },
    ],
  },
  {
    id: 'clause_art27_1',
    article_ref: 'Article 27(1)',
    obligation_title: 'Fundamental Rights Impact Assessment',
    plain_language: 'Public bodies, entities providing public services, and deployers of certain Annex III systems (points 5(b) and 5(c)) must perform a fundamental rights impact assessment before deployment, covering processes, affected persons, risks, oversight, and governance.',
    applies_conditions: {
      logic: 'OR',
      required: [
        { field: 'classification.rulesEngineResult.step5_role.primaryRole', op: 'eq', value: 'PUBLIC_BODY' },
        { field: 'classification.rulesEngineResult.step3_annexIII.matchedDomains', op: 'includes', value: '5b_credit' },
        { field: 'classification.rulesEngineResult.step3_annexIII.matchedDomains', op: 'includes', value: '5c_insurance' },
      ],
      notApplicableBasis: 'Art. 27(1) applies to public bodies and credit/insurance deployers only.',
      notApplicableCitation: 'Article 27(1)',
    },
    evidence_artefacts: [
      {
        id: 'ea_art27_1_1',
        name: 'Fundamental Rights Impact Assessment Document',
        description: 'Completed FRIA covering processes, affected persons, risks, human oversight, and governance measures per Art. 27(1)(a)-(f)',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art27_1'],
        alsoSatisfies: ['clause_art26_9'],
        matchTerms: [
          'fundamental rights impact assessment', 'fria', 'rights impact assessment',
          'fundamental rights assessment', 'human rights impact assessment',
          'fria completed', 'impact assessment document', 'rights assessment',
        ],
        negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'],
      },
      {
        id: 'ea_art27_1_2',
        name: 'Affected Categories Identification',
        description: 'Identification of categories of natural persons and groups likely to be affected by the AI system',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art27_1'],
        alsoSatisfies: ['clause_art26_11'],
        matchTerms: [
          'affected categories', 'affected persons identification', 'affected groups',
          'categories of persons', 'impact groups', 'affected population',
          'stakeholder identification', 'impact on persons',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be identified', 'forthcoming'],
      },
      {
        id: 'ea_art27_1_3',
        name: 'Risk Mitigation and Governance Measures',
        description: 'Documented measures to mitigate identified fundamental rights risks including internal governance and complaint mechanisms',
        tier: 1,
        required: true,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art27_1'],
        alsoSatisfies: ['clause_art26_5'],
        matchTerms: [
          'risk mitigation measures', 'governance measures', 'complaint mechanism',
          'mitigation plan', 'risk remediation', 'internal governance',
          'complaint procedure', 'rights mitigation',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be developed', 'forthcoming'],
      },
      {
        id: 'ea_art27_1_4',
        name: 'National Authority FRIA Notification',
        description: 'Evidence of notification to the relevant national authority of the FRIA results as required',
        tier: 2,
        required: false,
        gdpr_link: null,
        archetype_id: null,
        requiredFor: ['clause_art27_1'],
        alsoSatisfies: [],
        matchTerms: [
          'fria notification', 'authority notification', 'national authority',
          'fria submitted', 'regulatory notification', 'fria filing',
          'authority submission', 'notification to authority',
        ],
        negativeTerms: ['draft', 'tbd', 'planned', 'to be submitted', 'pending notification'],
      },
    ],
  },
];

const rows = CLAUSES.map((c) => ({
  ...c,
  evidence_artefacts: (c.evidence_artefacts || []).map((artefact) => {
    const setKey = CLAUSE_LINE_SET[c.id] || 'all';
    const lines = BUSINESS_LINE_SETS[setKey] || BUSINESS_LINE_SETS.all;
    const override = ARTEFACT_LINE_OVERRIDES[artefact.id];
    return {
      ...artefact,
      businessLines: artefact.businessLines || override || lines,
    };
  }),
  evidence_prompts: (c.evidence_prompts && c.evidence_prompts.length > 0)
    ? c.evidence_prompts
    : buildEvidencePrompts(c),
  evaluation_criteria: Object.keys(c.evaluation_criteria || {}).length > 0
    ? c.evaluation_criteria
    : buildEvaluationCriteria(c),
  corpus_version: c.corpus_version || '2026-01',
}));

console.log(`Seeding ${rows.length} clause rows into "clauses" table...`);

const { data, error } = await supabase
  .from('clauses')
  .upsert(rows, { onConflict: 'id' });

if (error) {
  console.error('Upsert error:', error.message);
  process.exit(1);
}

console.log(`Upserted ${rows.length} clauses. Seed complete.`);
