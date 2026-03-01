import { useState, useMemo, useCallback } from 'react';
import EvidenceCompletenessBar from '../shared/EvidenceCompletenessBar';
import { generateEvidenceRequestPDF } from '../../pdf/EvidenceRequestPDF';

/* ─── Evidence artefact data (mirrors seed-clauses.js) ────────────────────── */

const CLAUSE_ARTEFACTS = {
  clause_art4: [
    { id: 'ea_art4_1', name: 'Board-Approved AI Training Policy', description: 'Organisation-wide policy mandating AI literacy training for all staff interacting with AI systems', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art4', requiredFor: ['clause_art4'], alsoSatisfies: ['clause_art26_2'], matchTerms: ['ai training policy', 'ai literacy policy', 'board approved training', 'ai literacy programme', 'ai awareness programme', 'ai training framework', 'mandatory ai training', 'ai education policy', 'ai competency policy'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art4_2', name: 'Role-Based Training Curriculum', description: 'Training curriculum differentiated by role with completion tracking and assessment records', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art4', requiredFor: ['clause_art4'], alsoSatisfies: [], matchTerms: ['role based training', 'training curriculum', 'completion tracking', 'training matrix', 'role specific training', 'training programme', 'competency framework', 'learning pathway', 'training assessment'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'] },
    { id: 'ea_art4_3', name: 'Annual Refresher Programme', description: 'Annual refresher training with assessment to maintain AI literacy currency', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art4', requiredFor: ['clause_art4'], alsoSatisfies: [], matchTerms: ['annual refresher', 'refresher programme', 'refresher training', 'annual assessment', 'periodic training', 'recurrent training', 'annual review', 'yearly refresher', 'ongoing training'], negativeTerms: ['draft', 'tbd', 'planned', 'not yet', 'to be developed'] },
    { id: 'ea_art4_4', name: 'Onboarding AI Literacy Module', description: 'AI literacy module integrated into new joiner onboarding process', tier: 2, required: false, gdpr_link: null, archetype_id: 'aia_art4', requiredFor: ['clause_art4'], alsoSatisfies: [], matchTerms: ['onboarding module', 'new joiner training', 'induction training', 'onboarding ai', 'new starter training', 'induction programme', 'onboarding programme', 'joining programme'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
  ],
  clause_art26_1: [
    { id: 'ea_art26_1_1', name: 'Operational Procedures Referencing Provider Instructions', description: 'Documented operational procedures explicitly referencing the provider\'s instructions for use', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_1', requiredFor: ['clause_art26_1'], alsoSatisfies: ['clause_art26_5'], matchTerms: ['operational procedures', 'provider instructions', 'instructions for use', 'standard operating procedure', 'usage procedures', 'operating manual', 'operational guidelines', 'usage protocol', 'operating procedure'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_1_2', name: 'Change Management Process for Instruction Updates', description: 'Process ensuring operational procedures are updated when provider instructions change', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_1', requiredFor: ['clause_art26_1'], alsoSatisfies: [], matchTerms: ['change management', 'instruction updates', 'version control', 'change control process', 'update procedure', 'revision management', 'change management process', 'configuration management'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'] },
    { id: 'ea_art26_1_3', name: 'Staff Acknowledgement of Instruction Requirements', description: 'Evidence that relevant staff have read and acknowledged the AI system instructions for use', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art26_1', requiredFor: ['clause_art26_1'], alsoSatisfies: ['clause_art4'], matchTerms: ['staff acknowledgement', 'instruction acknowledgement', 'sign off', 'staff sign off', 'acknowledged instructions', 'read and understood', 'user acknowledgement', 'operator acknowledgement'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'not yet signed'] },
    { id: 'ea_art26_1_4', name: 'Periodic Compliance Review Against Provider Instructions', description: 'Regular review confirming actual use remains aligned with provider instructions', tier: 2, required: false, gdpr_link: null, archetype_id: 'aia_art26_1', requiredFor: ['clause_art26_1'], alsoSatisfies: [], matchTerms: ['periodic review', 'compliance review', 'periodic compliance', 'regular review', 'usage audit', 'instruction compliance review', 'annual compliance review', 'quarterly review'], negativeTerms: ['draft', 'tbd', 'planned', 'to be scheduled'] },
  ],
  clause_art26_2: [
    { id: 'ea_art26_2_1', name: 'AI Oversight Charter / Governance Policy', description: 'Named document assigning oversight responsibility with authority to suspend use', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_2', requiredFor: ['clause_art26_2'], alsoSatisfies: ['clause_art26_5'], matchTerms: ['oversight charter', 'governance policy', 'oversight policy', 'ai governance', 'oversight role', 'named responsible', 'suspend use', 'oversight mandate'], negativeTerms: ['draft', 'tbd', 'todo', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_2_2', name: 'Role Description — AI Oversight Person', description: 'Job description naming specific AI oversight duties', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_2', requiredFor: ['clause_art26_2'], alsoSatisfies: [], matchTerms: ['role description', 'job description', 'oversight person', 'oversight role', 'oversight duties', 'responsible person', 'named person', 'oversight function'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
    { id: 'ea_art26_2_3', name: 'Competence / Training Record', description: 'Evidence of technical training and competence assessment for the oversight role', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art26_2', requiredFor: ['clause_art26_2'], alsoSatisfies: ['clause_art4'], matchTerms: ['training record', 'competence assessment', 'training completion', 'certified', 'training programme', 'completed training', 'ai literacy', 'oversight training'], negativeTerms: ['draft', 'planned', 'to be completed', 'not yet', 'tbd'] },
    { id: 'ea_art26_2_4', name: 'Escalation and Suspension Protocol', description: 'Documented authority and procedure for the oversight person to suspend AI use', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art26_2', requiredFor: ['clause_art26_2'], alsoSatisfies: ['clause_art26_5'], matchTerms: ['escalation protocol', 'suspension protocol', 'suspend use', 'escalation procedure', 'authority to suspend', 'pause deployment', 'incident escalation'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
  ],
  clause_art26_4: [
    { id: 'ea_art26_4_1', name: 'Input Data Quality Policy', description: 'Policy defining data quality standards, relevance criteria, and representativeness requirements for AI input data', tier: 1, required: true, gdpr_link: 'Article 5(1)(d) GDPR — accuracy', archetype_id: null, requiredFor: ['clause_art26_4'], alsoSatisfies: [], matchTerms: ['data quality policy', 'input data quality', 'data quality standards', 'data quality framework', 'data governance policy', 'data quality requirements', 'data accuracy policy', 'data representativeness'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'to be developed'] },
    { id: 'ea_art26_4_2', name: 'Data Relevance and Representativeness Assessment', description: 'Documented assessment confirming input data is relevant and representative for the system intended purpose', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_4'], alsoSatisfies: ['clause_art26_9'], matchTerms: ['relevance assessment', 'representativeness assessment', 'data assessment', 'data suitability assessment', 'data fitness assessment', 'bias assessment', 'data representativeness review', 'intended purpose data assessment'], negativeTerms: ['draft', 'tbd', 'planned', 'to be completed', 'forthcoming'] },
    { id: 'ea_art26_4_3', name: 'Data Monitoring and Drift Detection Procedure', description: 'Procedure for ongoing monitoring of input data quality and detecting drift from training distribution', tier: 2, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_4'], alsoSatisfies: ['clause_art26_5'], matchTerms: ['data monitoring', 'drift detection', 'data drift', 'monitoring procedure', 'data quality monitoring', 'distribution drift', 'ongoing data monitoring', 'input monitoring', 'data pipeline monitoring'], negativeTerms: ['draft', 'tbd', 'planned', 'not yet implemented'] },
    { id: 'ea_art26_4_4', name: 'Data Correction and Remediation Process', description: 'Process for correcting or remediating input data quality issues when identified', tier: 2, required: false, gdpr_link: 'Article 16 GDPR — right to rectification', archetype_id: null, requiredFor: ['clause_art26_4'], alsoSatisfies: [], matchTerms: ['data correction', 'data remediation', 'correction process', 'data cleansing procedure', 'data rectification', 'quality remediation', 'data issue resolution', 'data correction procedure'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
  ],
  clause_art26_5: [
    { id: 'ea_art26_5_1', name: 'Internal Monitoring Framework', description: 'Framework for monitoring AI system operation aligned with provider instructions for use', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_5', requiredFor: ['clause_art26_5'], alsoSatisfies: ['clause_art26_1'], matchTerms: ['monitoring framework', 'internal monitoring', 'monitoring procedure', 'operational monitoring', 'system monitoring', 'performance monitoring', 'ai monitoring framework', 'continuous monitoring'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_5_2', name: 'Incident Detection and Reporting Procedure', description: 'Procedure for detecting AI-related incidents and reporting to provider and market surveillance authority', tier: 1, required: true, gdpr_link: 'Article 33 GDPR — notification of breach', archetype_id: 'aia_art26_5', requiredFor: ['clause_art26_5'], alsoSatisfies: [], matchTerms: ['incident detection', 'incident reporting', 'reporting procedure', 'incident management', 'serious incident', 'incident response', 'market surveillance notification', 'incident reporting protocol'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'] },
    { id: 'ea_art26_5_3', name: 'Market Surveillance Authority Notification Protocol', description: 'Protocol for notifying the relevant market surveillance authority of AI system risks or serious incidents', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_5', requiredFor: ['clause_art26_5'], alsoSatisfies: [], matchTerms: ['market surveillance', 'authority notification', 'surveillance authority', 'regulatory notification', 'notify authority', 'authority reporting', 'competent authority notification', 'market surveillance protocol'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
    { id: 'ea_art26_5_4', name: 'Serious Incident Response Plan', description: 'Documented plan for responding to serious incidents including suspension, notification, and remediation steps', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art26_5', requiredFor: ['clause_art26_5'], alsoSatisfies: ['clause_art26_2'], matchTerms: ['incident response plan', 'serious incident response', 'response plan', 'incident response procedure', 'emergency response', 'crisis management', 'incident management plan', 'business continuity'], negativeTerms: ['draft', 'tbd', 'planned', 'to be developed', 'forthcoming'] },
  ],
  clause_art26_6: [
    { id: 'ea_art26_6_1', name: 'Log Retention Policy', description: 'Policy specifying minimum six-month retention period for automatically generated AI system logs', tier: 1, required: true, gdpr_link: 'Article 5(1)(e) GDPR — storage limitation', archetype_id: 'aia_art26_6', requiredFor: ['clause_art26_6'], alsoSatisfies: [], matchTerms: ['log retention policy', 'retention policy', 'log retention period', 'six month retention', 'log storage policy', 'data retention policy', 'record retention', 'minimum retention period'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_6_2', name: 'Technical Architecture for Log Storage', description: 'Technical architecture showing log storage infrastructure, access controls, and retention enforcement', tier: 1, required: true, gdpr_link: null, archetype_id: 'aia_art26_6', requiredFor: ['clause_art26_6'], alsoSatisfies: [], matchTerms: ['log storage architecture', 'technical architecture', 'storage infrastructure', 'access controls', 'log management system', 'log infrastructure', 'storage and access controls', 'log storage design'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'planned'] },
    { id: 'ea_art26_6_3', name: 'Financial Services Record-Keeping Alignment', description: 'Evidence of alignment between AI log retention and existing financial services record-keeping requirements', tier: 2, required: false, gdpr_link: null, archetype_id: 'aia_art26_6', requiredFor: ['clause_art26_6'], alsoSatisfies: [], matchTerms: ['financial services record keeping', 'record keeping alignment', 'regulatory record keeping', 'financial record retention', 'mifid record keeping', 'financial services compliance', 'regulatory alignment'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
    { id: 'ea_art26_6_4', name: 'Log Integrity Verification Procedure', description: 'Procedure for verifying the integrity of stored logs to ensure they have not been tampered with', tier: 2, required: true, gdpr_link: null, archetype_id: 'aia_art26_6', requiredFor: ['clause_art26_6'], alsoSatisfies: [], matchTerms: ['log integrity', 'integrity verification', 'tamper detection', 'log verification procedure', 'integrity check', 'log audit trail', 'immutable logs', 'log integrity check'], negativeTerms: ['draft', 'tbd', 'planned', 'not yet implemented'] },
  ],
  clause_art26_7: [
    { id: 'ea_art26_7_1', name: 'Worker Notification Record', description: 'Evidence that affected workers and workers\' representatives were notified before AI system deployment', tier: 1, required: true, gdpr_link: 'Articles 13-14 GDPR — information to data subjects', archetype_id: null, requiredFor: ['clause_art26_7'], alsoSatisfies: ['clause_art26_11'], matchTerms: ['worker notification', 'employee notification', 'staff notification', 'workers informed', 'worker representatives notified', 'workforce notification', 'employee communication', 'worker information notice'], negativeTerms: ['draft', 'tbd', 'planned', 'to be sent', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_7_2', name: 'Works Council / Worker Representative Consultation', description: 'Record of consultation with works council or workers\' representatives per national law', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_7'], alsoSatisfies: [], matchTerms: ['works council', 'worker representatives', 'representative consultation', 'trade union consultation', 'employee representatives', 'staff consultation', 'works council consultation', 'collective consultation'], negativeTerms: ['draft', 'tbd', 'planned', 'to be scheduled', 'pending consultation'] },
    { id: 'ea_art26_7_3', name: 'Worker Information Document', description: 'Clear information document provided to affected workers describing the AI system and its impact', tier: 2, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_7'], alsoSatisfies: ['clause_art26_11'], matchTerms: ['information document', 'worker information', 'employee information pack', 'ai system description', 'worker briefing', 'information notice', 'transparency notice', 'employee transparency document'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder'] },
  ],
  clause_art26_9: [
    { id: 'ea_art26_9_1', name: 'DPIA Referencing Article 13 Transparency Information', description: 'Data protection impact assessment explicitly using the provider\'s Article 13 transparency information', tier: 1, required: true, gdpr_link: 'Article 35 GDPR — data protection impact assessment', archetype_id: 'aia_art26_9', requiredFor: ['clause_art26_9'], alsoSatisfies: ['clause_art27_1'], matchTerms: ['dpia', 'data protection impact assessment', 'article 13 transparency', 'impact assessment', 'privacy impact assessment', 'dpia completed', 'dpia referencing provider', 'data protection assessment'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_9_2', name: 'Data Processing Records Updated for AI', description: 'Records of processing activities updated to reflect AI system data flows and processing purposes', tier: 1, required: true, gdpr_link: 'Article 30 GDPR — records of processing activities', archetype_id: 'aia_art26_9', requiredFor: ['clause_art26_9'], alsoSatisfies: [], matchTerms: ['data processing records', 'processing activities', 'ropa updated', 'record of processing', 'data flow mapping', 'processing records', 'article 30 records', 'data processing register'], negativeTerms: ['draft', 'tbd', 'template', 'planned', 'to be updated'] },
    { id: 'ea_art26_9_3', name: 'Privacy Impact Assessment Covering AI Risks', description: 'Privacy impact assessment specifically covering AI-specific risks including automated decision-making', tier: 2, required: true, gdpr_link: 'Article 22 GDPR — automated individual decision-making', archetype_id: 'aia_art26_9', requiredFor: ['clause_art26_9'], alsoSatisfies: ['clause_art27_1'], matchTerms: ['privacy impact assessment', 'ai risk assessment', 'ai specific risks', 'automated decision making risk', 'privacy risk assessment', 'pia completed', 'ai privacy assessment', 'algorithmic impact assessment'], negativeTerms: ['draft', 'tbd', 'planned', 'to be completed', 'forthcoming'] },
    { id: 'ea_art26_9_4', name: 'DPO Sign-Off on AI Data Processing', description: 'Data protection officer sign-off confirming AI system data processing activities are compliant', tier: 2, required: true, gdpr_link: 'Articles 37-39 GDPR — DPO role', archetype_id: 'aia_art26_9', requiredFor: ['clause_art26_9'], alsoSatisfies: [], matchTerms: ['dpo sign off', 'dpo approval', 'data protection officer', 'dpo review', 'dpo sign-off', 'dpo confirmed', 'dpo endorsement', 'data protection officer approval'], negativeTerms: ['draft', 'tbd', 'pending sign off', 'awaiting dpo', 'to be signed'] },
  ],
  clause_art26_11: [
    { id: 'ea_art26_11_1', name: 'Transparency Notice for Affected Persons', description: 'Notice informing natural persons that they are subject to decisions made or assisted by a high-risk AI system', tier: 1, required: true, gdpr_link: 'Articles 13-14 GDPR — information to data subjects', archetype_id: null, requiredFor: ['clause_art26_11'], alsoSatisfies: [], matchTerms: ['transparency notice', 'affected persons notice', 'subject notification', 'ai transparency notice', 'individual notification', 'person notification', 'transparency disclosure', 'ai use disclosure'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art26_11_2', name: 'Communication Channel for AI Disclosure', description: 'Documented channel through which affected persons are informed of AI system use in decisions affecting them', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_11'], alsoSatisfies: [], matchTerms: ['communication channel', 'disclosure mechanism', 'notification channel', 'information delivery', 'transparency mechanism', 'disclosure process', 'communication process', 'notification method'], negativeTerms: ['draft', 'tbd', 'planned', 'to be established', 'forthcoming'] },
    { id: 'ea_art26_11_3', name: 'Record of Transparency Communications', description: 'Audit trail showing transparency notices were actually delivered to affected persons', tier: 2, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art26_11'], alsoSatisfies: ['clause_art26_7'], matchTerms: ['transparency record', 'communication record', 'notification record', 'delivery record', 'audit trail', 'disclosure record', 'communication log', 'notification log'], negativeTerms: ['draft', 'tbd', 'planned', 'not yet delivered'] },
  ],
  clause_art27_1: [
    { id: 'ea_art27_1_1', name: 'Fundamental Rights Impact Assessment Document', description: 'Completed FRIA covering processes, affected persons, risks, human oversight, and governance measures per Art. 27(1)(a)-(f)', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art27_1'], alsoSatisfies: ['clause_art26_9'], matchTerms: ['fundamental rights impact assessment', 'fria', 'rights impact assessment', 'fundamental rights assessment', 'human rights impact assessment', 'fria completed', 'impact assessment document', 'rights assessment'], negativeTerms: ['draft', 'tbd', 'template', 'placeholder', 'forthcoming', 'to be confirmed'] },
    { id: 'ea_art27_1_2', name: 'Affected Categories Identification', description: 'Identification of categories of natural persons and groups likely to be affected by the AI system', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art27_1'], alsoSatisfies: ['clause_art26_11'], matchTerms: ['affected categories', 'affected persons identification', 'affected groups', 'categories of persons', 'impact groups', 'affected population', 'stakeholder identification', 'impact on persons'], negativeTerms: ['draft', 'tbd', 'planned', 'to be identified', 'forthcoming'] },
    { id: 'ea_art27_1_3', name: 'Risk Mitigation and Governance Measures', description: 'Documented measures to mitigate identified fundamental rights risks including internal governance and complaint mechanisms', tier: 1, required: true, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art27_1'], alsoSatisfies: ['clause_art26_5'], matchTerms: ['risk mitigation measures', 'governance measures', 'complaint mechanism', 'mitigation plan', 'risk remediation', 'internal governance', 'complaint procedure', 'rights mitigation'], negativeTerms: ['draft', 'tbd', 'planned', 'to be developed', 'forthcoming'] },
    { id: 'ea_art27_1_4', name: 'National Authority FRIA Notification', description: 'Evidence of notification to the relevant national authority of the FRIA results as required', tier: 2, required: false, gdpr_link: null, archetype_id: null, requiredFor: ['clause_art27_1'], alsoSatisfies: [], matchTerms: ['fria notification', 'authority notification', 'national authority', 'fria submitted', 'regulatory notification', 'fria filing', 'authority submission', 'notification to authority'], negativeTerms: ['draft', 'tbd', 'planned', 'to be submitted', 'pending notification'] },
  ],
};

const ARTEFACT_LINE_OVERRIDES = {
  ea_art26_6_3: ['credit_lending', 'insurance', 'payments_fintech'],
};

const BUSINESS_LINE_SETS = {
  all: [
    'credit_lending',
    'insurance',
    'employment_hr',
    'education_training',
    'biometrics_identity',
    'critical_infrastructure',
    'law_enforcement',
    'migration_border',
    'justice_democratic',
    'public_sector',
    'healthcare_life_sciences',
    'payments_fintech',
    'transport_mobility',
    'retail_ecommerce',
    'marketing_advertising',
    'security_surveillance',
    'other',
  ],
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

const CLAUSE_ARTEFACTS_WITH_LINES = Object.fromEntries(
  Object.entries(CLAUSE_ARTEFACTS).map(([clauseId, artefacts]) => {
    const setKey = CLAUSE_LINE_SET[clauseId] || 'all';
    const lines = BUSINESS_LINE_SETS[setKey] || BUSINESS_LINE_SETS.all;
    return [
      clauseId,
      (artefacts || []).map((artefact) => ({
        ...artefact,
        businessLines: artefact.businessLines || ARTEFACT_LINE_OVERRIDES[artefact.id] || lines,
      })),
    ];
  }),
);

const OBLIGATION_META = {
  clause_art4:      { articleRef: 'Article 4',      title: 'AI Literacy' },
  clause_art26_1:   { articleRef: 'Article 26(1)',   title: 'Use per Instructions' },
  clause_art26_2:   { articleRef: 'Article 26(2)',   title: 'Human Oversight' },
  clause_art26_4:   { articleRef: 'Article 26(4)',   title: 'Input Data Quality' },
  clause_art26_5:   { articleRef: 'Article 26(5)',   title: 'Monitoring & Incident Reporting' },
  clause_art26_6:   { articleRef: 'Article 26(6)',   title: 'Log Retention' },
  clause_art26_7:   { articleRef: 'Article 26(7)',   title: 'Worker Notification' },
  clause_art26_9:   { articleRef: 'Article 26(9)',   title: 'GDPR DPIA Bridge' },
  clause_art26_11:  { articleRef: 'Article 26(11)',  title: 'Affected Persons Transparency' },
  clause_art27_1:   { articleRef: 'Article 27(1)',   title: 'Fundamental Rights Impact Assessment' },
};

const OBL_ID_TO_CLAUSE = {
  aia_art4: 'clause_art4', aia_art26_1: 'clause_art26_1', aia_art26_2: 'clause_art26_2',
  aia_art26_4: 'clause_art26_4', aia_art26_5: 'clause_art26_5', aia_art26_6: 'clause_art26_6',
  aia_art26_7: 'clause_art26_7', aia_art26_9: 'clause_art26_9', aia_art26_11: 'clause_art26_11',
  aia_art27_1: 'clause_art27_1',
};

const VERDICT_COLORS = {
  COMPLIANT:             { bg: '#DCFCE7', text: '#166534' },
  PARTIALLY_COMPLIANT:   { bg: '#FEF3C7', text: '#92400E' },
  NON_COMPLIANT:         { bg: '#FEE2E2', text: '#991B1B' },
  INSUFFICIENT_EVIDENCE: { bg: '#F3F4F6', text: '#374151' },
  CITATION_FAILED:       { bg: '#FFEDD5', text: '#9A3412' },
  NOT_EVALUATED:         { bg: '#F3F4F6', text: '#6B7280' },
};

/* ─── Matching logic (duplicated from server — pure functions) ────────────── */

function normalise(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchArtefact(artefact, evidenceText) {
  const norm = normalise(evidenceText);
  if (!norm) return { status: 'UNKNOWN', reason: 'no_evidence', score: 0 };

  for (const neg of artefact.negativeTerms || []) {
    if (norm.includes(normalise(neg))) {
      return { status: 'ABSENT', reason: 'negative_term_found', matchedTerm: neg, score: 0 };
    }
  }

  const matched = [];
  for (const term of artefact.matchTerms || []) {
    if (norm.includes(normalise(term))) matched.push(term);
  }
  if (matched.length > 0) return { status: 'PRESENT', matchedTerms: matched, score: 1.0 };
  return { status: 'ABSENT', reason: 'no_match_terms_found', score: 0 };
}

function buildPackData(assessmentState) {
  const obligations = assessmentState.obligations || [];
  const results = [];
  const selectedLine = assessmentState?.system?.businessLine || '';

  for (const obl of obligations) {
    const clauseId = OBL_ID_TO_CLAUSE[obl.obligationId] || obl.obligationId;
    const allArtefacts = CLAUSE_ARTEFACTS_WITH_LINES[clauseId];
    if (!allArtefacts || allArtefacts.length === 0) continue;
    const artefacts = selectedLine
      ? allArtefacts.filter((artefact) =>
        !artefact.businessLines || artefact.businessLines.includes(selectedLine))
      : allArtefacts;
    if (artefacts.length === 0) continue;

    const controlDesc = obl.controlDescription || obl.evidence?.controlDescription || '';
    const evidenceRef = obl.evidenceReference || obl.evidence?.evidenceReference || '';
    const evidenceText = `${controlDesc} ${evidenceRef}`;

    const ev = obl.evaluationResult?.evaluation || obl.evaluationResult || {};
    const verdict = obl.consultantVerdict || ev.verdict || 'NOT_EVALUATED';

    const artefactResults = artefacts.map((a) => ({
      ...a,
      matchResult: matchArtefact(a, evidenceText),
    }));

    const requiredArtefacts = artefactResults.filter((a) => a.required);
    const presentCount = requiredArtefacts.filter((a) => a.matchResult.status === 'PRESENT').length;
    const requiredCount = requiredArtefacts.length || 1;
    const completenessScore = Math.round((presentCount / requiredCount) * 100);

    const missingArtefacts = requiredArtefacts.filter((a) => a.matchResult.status === 'ABSENT');

    const crossClauseInsights = artefactResults
      .filter((a) => (a.alsoSatisfies || []).length > 0 && a.matchResult.status === 'ABSENT')
      .map((a) => ({
        artefactId: a.id,
        artefactName: a.name,
        primaryClause: clauseId,
        alsoSatisfies: a.alsoSatisfies,
        alsoSatisfiesTitles: a.alsoSatisfies.map((cid) => OBLIGATION_META[cid]?.title || cid),
      }));

    const meta = OBLIGATION_META[clauseId] || {};
    results.push({
      obligationId: obl.obligationId,
      clauseId,
      articleRef: meta.articleRef || '',
      obligationTitle: meta.title || '',
      verdict,
      evidenceArtefacts: artefactResults,
      completenessScore,
      missingArtefacts,
      crossClauseInsights,
    });
  }

  return results;
}

/* ─── Subcomponents ───────────────────────────────────────────────────────── */

function ScoreCircle({ score }) {
  const s = Math.round(score ?? 0);
  const color = s >= 70 ? '#16A34A' : s >= 40 ? '#D97706' : '#DC2626';
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center border-2 font-bold text-sm"
      style={{ borderColor: color, color }}
    >
      {s}%
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const vc = VERDICT_COLORS[verdict] || VERDICT_COLORS.NOT_EVALUATED;
  const label = (verdict || 'NOT_EVALUATED').replace(/_/g, ' ');
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
      style={{ backgroundColor: vc.bg, color: vc.text }}
    >
      {label}
    </span>
  );
}

const OWNER_OPTIONS = ['Product', 'Data', 'Security', 'Legal', 'Risk', 'Engineering', 'Compliance'];
const ARTEFACT_STATUS_OPTIONS = ['Not started', 'In progress', 'Ready', 'Approved'];

function ArtefactRow({ artefact, note, onNoteChange, artefactMeta, onMetaChange }) {
  const { matchResult } = artefact;
  const status = matchResult?.status || 'UNKNOWN';
  const meta = artefactMeta || {};

  const icon = status === 'PRESENT' ? '✓' : status === 'ABSENT' ? '✗' : '?';
  const iconColor = status === 'PRESENT' ? '#16A34A' : status === 'ABSENT' ? '#DC2626' : '#9CA3AF';
  const label = status === 'ABSENT'
    ? `MISSING: ${artefact.name}`
    : status === 'UNKNOWN'
      ? `${artefact.name} — not yet assessed`
      : artefact.name;

  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="font-bold text-base mt-0.5" style={{ color: iconColor }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${status === 'ABSENT' ? 'font-bold text-red-800' : 'text-gray-800'}`}>
              {label}
            </span>
            {artefact.required && (
              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                Required
              </span>
            )}
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              Tier {artefact.tier}
            </span>
            {artefact.gdpr_link && (
              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                {artefact.gdpr_link}
              </span>
            )}
          </div>
          {status === 'ABSENT' && (
            <p className="text-xs text-gray-500 mt-0.5">{artefact.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <select
              value={meta.owner || ''}
              onChange={(e) => onMetaChange({ owner: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-blue-400"
            >
              <option value="">Owner…</option>
              {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select
              value={meta.status || ''}
              onChange={(e) => onMetaChange({ status: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-blue-400"
            >
              <option value="">Status…</option>
              {ARTEFACT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="text"
              placeholder="Evidence URL…"
              value={meta.evidenceUrl || ''}
              onChange={(e) => onMetaChange({ evidenceUrl: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="Reviewer…"
              value={meta.reviewer || ''}
              onChange={(e) => onMetaChange({ reviewer: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-blue-400"
            />
          </div>
          <input
            type="text"
            placeholder="Consultant note…"
            value={note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  );
}

function CrossClausePanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-bold text-amber-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
        Documents that close multiple obligations
      </h3>
      <div className="space-y-2">
        {insights.map((ins) => {
          const primaryTitle = OBLIGATION_META[ins.primaryClause]?.title || ins.primaryClause;
          return (
            <div key={ins.artefactId} className="text-sm text-amber-800">
              <span className="font-semibold">{ins.artefactName}</span>
              <span className="text-amber-700"> — required for </span>
              <span className="font-medium">{primaryTitle}</span>
              <span className="text-amber-700">, also satisfies </span>
              <span className="font-medium">{ins.alsoSatisfiesTitles.length} other obligation{ins.alsoSatisfiesTitles.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {ins.alsoSatisfiesTitles.map((t) => (
                  <span key={t} className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ObligationCard({ item, notes, onNoteChange, onAdopt, backlogKeys, artefactMetaMap, onArtefactMetaChange }) {
  const [expanded, setExpanded] = useState(true);
  const crossInsights = item.crossClauseInsights || [];
  const missing = item.missingArtefacts || [];
  const pendingMissing = missing.filter((a) => !backlogKeys.has(`${item.obligationId}:${a.id}`));
  const canAdopt = pendingMissing.length > 0;
  const adoptLabel = missing.length === 0
    ? 'No gaps to add'
    : canAdopt
      ? 'Adopt to remediation backlog'
      : 'Added to backlog';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 shadow-sm">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50"
        onClick={() => setExpanded((p) => !p)}
      >
        <span
          className="px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: '#1B4B82' }}
        >
          {item.articleRef}
        </span>
        <span className="text-sm font-semibold text-gray-900 flex-1" style={{ fontFamily: 'Georgia, serif' }}>
          {item.obligationTitle}
        </span>
        <VerdictBadge verdict={item.verdict} />
        <ScoreCircle score={item.completenessScore} />
        <span className="text-gray-400 text-sm">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {crossInsights.length > 0 && (
            <div className="mb-3">
              {crossInsights.map((ins) => (
                <div
                  key={ins.artefactId}
                  className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded px-3 py-2 mb-1"
                >
                  💡 <span className="font-semibold">{ins.artefactName}</span> also helps satisfy{' '}
                  {ins.alsoSatisfiesTitles.join(', ')}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-0">
            {item.evidenceArtefacts.map((a) => (
              <ArtefactRow
                key={a.id}
                artefact={a}
                note={notes[a.id] || ''}
                onNoteChange={(val) => onNoteChange(a.id, val)}
                artefactMeta={artefactMetaMap?.[`${item.obligationId}:${a.id}`]}
                onMetaChange={(fields) => onArtefactMetaChange(item.obligationId, a.id, fields)}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onAdopt(item, pendingMissing)}
              disabled={!canAdopt}
              className={`text-xs border rounded px-3 py-1 transition-colors ${
                canAdopt
                  ? 'text-blue-700 border-blue-300 hover:bg-blue-50'
                  : 'text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              {adoptLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function EvidencePack({ assessmentState, dispatch, onComplete, canContinue, guidance }) {
  const [notes, setNotes] = useState({});
  const artefactMetaMap = assessmentState.evidencePackArtefacts || {};
  const callout = guidance?.nextBestActions?.[0];

  const handleArtefactMetaChange = useCallback((obligationId, artefactId, fields) => {
    dispatch({
      type: 'SET_EVIDENCE_ARTEFACT',
      payload: { obligationId, artefactId, fields },
    });
  }, [dispatch]);

  const packData = useMemo(() => buildPackData(assessmentState), [assessmentState]);
  const backlogKeys = useMemo(
    () => new Set((assessmentState.remediationBacklog || []).map((item) => item.id)),
    [assessmentState.remediationBacklog],
  );

  const sorted = useMemo(
    () => [...packData].sort((a, b) => a.completenessScore - b.completenessScore),
    [packData],
  );

  const aggregateScore = useMemo(() => {
    if (packData.length === 0) return 0;
    const total = packData.reduce((s, p) => s + p.completenessScore, 0);
    return Math.round(total / packData.length);
  }, [packData]);

  const counts = useMemo(() => {
    let complete = 0, partial = 0, gaps = 0;
    for (const p of packData) {
      if (p.completenessScore >= 80) complete++;
      else if (p.completenessScore >= 40) partial++;
      else gaps++;
    }
    return { complete, partial, gaps };
  }, [packData]);

  const allCrossInsights = useMemo(() => {
    const seen = new Set();
    const all = [];
    for (const p of packData) {
      for (const ins of p.crossClauseInsights) {
        if (!seen.has(ins.artefactId)) {
          seen.add(ins.artefactId);
          all.push(ins);
        }
      }
    }
    return all;
  }, [packData]);

  const handleNoteChange = useCallback((artefactId, value) => {
    setNotes((prev) => ({ ...prev, [artefactId]: value }));
  }, []);

  const handleExportPDF = useCallback(() => {
    generateEvidenceRequestPDF(packData, assessmentState);
  }, [packData, assessmentState]);

  const handleExportCSV = useCallback(async () => {
    try {
      const res = await fetch('/api/report/evidence-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentState, format: 'csv' }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'evidence-pack.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[evidence-pack-csv]', err.message);
    }
  }, [assessmentState]);

  const handleExportJSON = useCallback(async () => {
    try {
      const res = await fetch('/api/report/evidence-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentState, format: 'json' }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'evidence-pack.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[evidence-pack-json]', err.message);
    }
  }, [assessmentState]);

  const handleAdopt = useCallback((item, pendingMissing) => {
    if (!pendingMissing || pendingMissing.length === 0) return;
    const createdAt = new Date().toISOString();
    pendingMissing.forEach((artefact) => {
      dispatch({
        type: 'ADD_REMEDIATION_ITEM',
        payload: {
          id: `${item.obligationId}:${artefact.id}`,
          obligationId: item.obligationId,
          obligationTitle: item.obligationTitle,
          articleRef: item.articleRef,
          clauseId: item.clauseId,
          artefactId: artefact.id,
          artefactName: artefact.name,
          description: artefact.description,
          priority: 'MEDIUM',
          status: 'OPEN',
          createdAt,
        },
      });
    });
  }, [dispatch]);

  const systemName = assessmentState.system?.name || 'Unnamed System';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
            Evidence Pack — {systemName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Work-order output summarising evidence completeness per obligation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded text-xs font-semibold border transition-colors hover:bg-gray-50"
            style={{ color: '#1B4B82', borderColor: '#1B4B82' }}
            data-testid="export-csv"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded text-xs font-semibold border transition-colors hover:bg-gray-50"
            style={{ color: '#1B4B82', borderColor: '#1B4B82' }}
            data-testid="export-json"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 rounded text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#0F1B2D' }}
          >
            Generate Evidence Request PDF
          </button>
        </div>
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

      {/* Aggregate bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Overall evidence completeness
          </span>
          <span className="text-sm text-gray-500">
            {packData.length} obligation{packData.length !== 1 ? 's' : ''} assessed
          </span>
        </div>
        <EvidenceCompletenessBar score={aggregateScore} size="lg" showLabel />
        <div className="flex gap-4 mt-3">
          <span className="text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: '#16A34A' }} />
            Complete (≥80%): <strong>{counts.complete}</strong>
          </span>
          <span className="text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: '#D97706' }} />
            Partial (40–79%): <strong>{counts.partial}</strong>
          </span>
          <span className="text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: '#DC2626' }} />
            Gaps (&lt;40%): <strong>{counts.gaps}</strong>
          </span>
        </div>
      </div>

      {/* Cross-clause insights */}
      <CrossClausePanel insights={allCrossInsights} />

      {/* Obligation cards sorted by completeness (worst first) */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <p className="text-sm">No obligation evidence available yet. Complete the Obligation Assessment phase first.</p>
        </div>
      ) : (
        sorted.map((item) => (
          <ObligationCard
            key={item.obligationId}
            item={item}
            notes={notes}
            onNoteChange={handleNoteChange}
            onAdopt={handleAdopt}
            backlogKeys={backlogKeys}
            artefactMetaMap={artefactMetaMap}
            onArtefactMetaChange={handleArtefactMetaChange}
          />
        ))
      )}

      {packData.length > 0 && (
        <div className="mt-8 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (canContinue && typeof onComplete === 'function') onComplete();
            }}
            disabled={!canContinue}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              canContinue ? 'bg-[#1B4B82] hover:bg-[#163d6a]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Continue to Gap Synthesis
          </button>
          {!canContinue && (
            <p className="text-xs text-gray-500">
              Complete all applicable obligations to unlock synthesis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
