import PlainLanguageToggle from '../shared/PlainLanguageToggle';
import AlternativeInterpretationPanel from '../shared/AlternativeInterpretationPanel';
import CitationBlock from '../shared/CitationBlock';
import LegalCertaintyBadge from '../shared/LegalCertaintyBadge';
import ConfidenceBadge from '../shared/ConfidenceBadge';
import CitationVerifiedBadge from '../shared/CitationVerifiedBadge';
import ArchetypePanel from '../shared/ArchetypePanel';
import ApplicabilityGate from '../shared/ApplicabilityGate';
import EvidenceCompletenessBar from '../shared/EvidenceCompletenessBar';
import ConsistencyBadge from '../shared/ConsistencyBadge';
import { useState, useEffect, useMemo } from 'react';
import { getLineGuidance, getProofPrompts } from '../../data/businessLineGuidance';

/* ─── Constants ──────────────────────────────────────────────────────────────── */

export const OBLIGATIONS = [
  {
    id: 'aia_art4',
    clauseRef: 'clause_art4',
    articleRef: 'Article 4',
    title: 'AI Literacy',
    subtitle: 'Ensure staff AI literacy',
    legalText:
      'AI literacy\n' +
      'Providers and deployers of AI systems shall take measures to ensure, to their best extent, a sufficient level of AI literacy of their staff and other persons dealing with the operation and use of AI systems on their behalf, taking into account their technical knowledge, experience, education and training and the context the AI systems are to be used in, and considering the persons or groups of persons on whom the AI systems are to be used.',
    plainLanguage:
      'Your organisation must train staff and anyone using AI systems on your behalf so they understand AI well enough for their role, considering their background and who the AI affects.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_2'],
  },
  {
    id: 'aia_art26_1',
    clauseRef: 'clause_art26_1',
    articleRef: 'Article 26(1)',
    title: 'Use per Instructions',
    subtitle: 'Operate system according to provider instructions',
    legalText:
      'Obligations of deployers of high-risk AI systems\n' +
      '1. Deployers of high-risk AI systems shall take appropriate technical and organisational measures to ensure they use such systems in accordance with the instructions for use accompanying the systems, pursuant to paragraphs 3 and 6.',
    plainLanguage:
      'You must use the high-risk AI system according to the provider’s instructions for use, with appropriate technical and organisational measures in place.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_5', 'aia_art26_6'],
  },
  {
    id: 'aia_art26_2',
    clauseRef: 'clause_art26_2',
    articleRef: 'Article 26(2)',
    title: 'Human Oversight',
    subtitle: 'Assign competent human oversight personnel',
    legalText:
      '2. Deployers shall assign human oversight to natural persons who have the necessary competence, training and authority, as well as the necessary support.',
    plainLanguage:
      'You must assign human oversight to people who have the right skills, training, authority, and support to oversee the AI system effectively.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art4', 'aia_art26_1'],
  },
  {
    id: 'aia_art26_4',
    clauseRef: 'clause_art26_4',
    articleRef: 'Article 26(4)',
    title: 'Input Data Quality',
    subtitle: 'Ensure relevant and representative input data',
    legalText:
      '4. Without prejudice to paragraphs 1 and 2, to the extent the deployer exercises control over the input data, that deployer shall ensure that input data is relevant and sufficiently representative in view of the intended purpose of the high-risk AI system.',
    plainLanguage:
      'If you control the input data fed into the AI system, you must ensure it is relevant and representative for the system’s intended purpose.',
    certainty: 'ESTABLISHED_INTERPRETATION',
    applies_conditions: {
      logic: 'OR',
      required: [
        { field: 'system.inputDataController', op: 'eq', value: 'Our organisation' },
        { field: 'system.inputDataController', op: 'eq', value: 'Mixed' },
      ],
      notApplicableBasis: 'Art. 26(4) applies only where the deployer controls the input data.',
      notApplicableCitation: 'Article 26(4)',
    },
    relatedArticleIds: ['aia_art26_1'],
  },
  {
    id: 'aia_art26_5',
    clauseRef: 'clause_art26_5',
    articleRef: 'Article 26(5)',
    title: 'Monitoring & Incident Reporting',
    subtitle: 'Monitor operations and report incidents',
    legalText:
      '5. Deployers shall monitor the operation of the high-risk AI system on the basis of the instructions for use and, where relevant, inform providers in accordance with Article 72. Where deployers have reason to consider that the use of the high-risk AI system in accordance with the instructions may result in that AI system presenting a risk within the meaning of Article 79(1), they shall, without undue delay, inform the provider or distributor and the relevant market surveillance authority, and shall suspend the use of that system. Where deployers have identified a serious incident, they shall also immediately inform first the provider, and then the importer or distributor and the relevant market surveillance authorities of that incident. If the deployer is not able to reach the provider, Article 73 shall apply mutatis mutandis. This obligation shall not cover sensitive operational data of deployers of AI systems which are law enforcement authorities. For deployers that are financial institutions subject to requirements regarding their internal governance, arrangements or processes under Union financial services law, the monitoring obligation set out in the first subparagraph shall be deemed to be fulfilled by complying with the rules on internal governance arrangements, processes and mechanisms pursuant to the relevant financial service law.',
    plainLanguage:
      'You must monitor the AI system per the instructions, report risks to providers and authorities without delay, and suspend the system if it presents a risk. Serious incidents require immediate notification.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_1', 'aia_art26_6'],
  },
  {
    id: 'aia_art26_6',
    clauseRef: 'clause_art26_6',
    articleRef: 'Article 26(6)',
    title: 'Log Retention',
    subtitle: 'Keep automatically generated logs',
    legalText:
      '6. Deployers of high-risk AI systems shall keep the logs automatically generated by that high-risk AI system to the extent such logs are under their control, for a period appropriate to the intended purpose of the high-risk AI system, of at least six months, unless provided otherwise in applicable Union or national law, in particular in Union law on the protection of personal data. Deployers that are financial institutions subject to requirements regarding their internal governance, arrangements or processes under Union financial services law shall maintain the logs as part of the documentation kept pursuant to the relevant Union financial service law.',
    plainLanguage:
      'You must keep AI-generated logs for at least six months (or longer if required by other law). Financial institutions must maintain logs as part of their existing financial services documentation.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_5', 'aia_art26_1'],
  },
  {
    id: 'aia_art26_7',
    clauseRef: 'clause_art26_7',
    articleRef: 'Article 26(7)',
    title: 'Worker Notification',
    subtitle: 'Inform workers of AI system use',
    legalText:
      '7. Before putting into service or using a high-risk AI system at the workplace, deployers who are employers shall inform workers’ representatives and the affected workers that they will be subject to the use of the high-risk AI system. This information shall be provided, where applicable, in accordance with the rules and procedures laid down in Union and national law and practice on information of workers and their representatives.',
    plainLanguage:
      'Before using a high-risk AI system in the workplace, you must inform workers’ representatives and affected workers that they will be subject to it.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: {
      logic: 'AND',
      required: [
        { field: 'system.deploymentContext', op: 'includes', value: 'employee' },
      ],
      notApplicableBasis: 'Art. 26(7) applies to deployers using AI in the workplace affecting workers.',
      notApplicableCitation: 'Article 26(7)',
    },
    relatedArticleIds: ['aia_art26_11'],
  },
  {
    id: 'aia_art26_9',
    clauseRef: 'clause_art26_9',
    articleRef: 'Article 26(9)',
    title: 'GDPR DPIA Bridge',
    subtitle: 'Use AI transparency info for DPIA compliance',
    legalText:
      '9. Where applicable, deployers of high-risk AI systems shall use the information provided under Article 13 of this Regulation to comply with their obligation to carry out a data protection impact assessment under Article 35 of Regulation (EU) 2016/679 or Article 27 of Directive (EU) 2016/680.',
    plainLanguage:
      'Where applicable, use the transparency information provided by the AI system’s provider to carry out your data protection impact assessment under the GDPR.',
    certainty: 'ESTABLISHED_INTERPRETATION',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_11'],
  },
  {
    id: 'aia_art26_11',
    clauseRef: 'clause_art26_11',
    articleRef: 'Article 26(11)',
    title: 'Affected Persons Transparency',
    subtitle: 'Inform individuals subject to AI decisions',
    legalText:
      '11. Without prejudice to Article 50 of this Regulation, deployers of high-risk AI systems referred to in Annex III that make decisions or assist in making decisions related to natural persons shall inform the natural persons that they are subject to the use of the high-risk AI system. For high-risk AI systems used for law enforcement purposes Article 13 of Directive (EU) 2016/680 shall apply.',
    plainLanguage:
      'You must inform individuals that they are subject to decisions made or assisted by a high-risk AI system listed in Annex III.',
    certainty: 'CLEAR_TEXT',
    applies_conditions: null,
    relatedArticleIds: ['aia_art26_7', 'aia_art26_9'],
  },
  {
    id: 'aia_art27_1',
    clauseRef: 'clause_art27_1',
    articleRef: 'Article 27(1)',
    title: 'Fundamental Rights Impact Assessment',
    subtitle: 'Conduct FRIA before deployment',
    legalText:
      'Fundamental rights impact assessment for high-risk AI systems\n' +
      '1. Prior to deploying a high-risk AI system referred to in Article 6(2), with the exception of high-risk AI systems intended to be used in the area listed in point 2 of Annex III, deployers that are bodies governed by public law, or are private entities providing public services, and deployers of high-risk AI systems referred to in points 5 (b) and (c) of Annex III, shall perform an assessment of the impact on fundamental rights that the use of such system may produce. For that purpose, deployers shall perform an assessment consisting of:\n' +
      '(a) a description of the deployer’s processes in which the high-risk AI system will be used in line with its intended purpose;\n' +
      '(b) a description of the period of time within which, and the frequency with which, each high-risk AI system is intended to be used;\n' +
      '(c) the categories of natural persons and groups likely to be affected by its use in the specific context;\n' +
      '(d) the specific risks of harm likely to have an impact on the categories of natural persons or groups of persons identified pursuant to point (c) of this paragraph, taking into account the information given by the provider pursuant to Article 13;\n' +
      '(e) a description of the implementation of human oversight measures, according to the instructions for use;\n' +
      '(f) the measures to be taken in the case of the materialisation of those risks, including the arrangements for internal governance and complaint mechanisms.',
    plainLanguage:
      'Public bodies, entities providing public services, and deployers of certain Annex III systems (points 5(b) and 5(c)) must perform a fundamental rights impact assessment before deployment, covering processes, affected persons, risks, oversight, and governance.',
    certainty: 'CONTESTED',
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
    relatedArticleIds: ['aia_art26_9'],
  },
];

const FS_CONTROL_ARCHETYPES = {
  aia_art4: {
    mostCommonGap:
      'Lack of formal AI literacy programme tailored to different staff roles and seniority levels.',
    typicalEvidence: [
      'Board-approved AI training policy',
      'Role-based training curriculum with completion tracking',
      'Annual refresher programme with assessment',
      'Onboarding AI literacy module for new joiners',
    ],
    remediationTemplate:
      'Implement a tiered AI literacy programme covering board and senior management awareness, operational staff training on AI fundamentals and risk, and specialist training for AI model owners. Track completion rates and require annual refresher certification.',
  },
  aia_art26_1: {
    mostCommonGap:
      'No documented procedure mapping provider instructions to internal operational processes.',
    typicalEvidence: [
      'Documented operational procedures referencing provider instructions for use',
      'Change management process for instruction updates',
      'Staff acknowledgement of instruction requirements',
      'Periodic compliance review against provider instructions',
    ],
    remediationTemplate:
      'Map each section of the provider’s instructions for use to internal operational procedures. Establish a change management process to incorporate instruction updates within 30 days. Require operational staff sign-off on key usage requirements.',
  },
  aia_art26_2: {
    mostCommonGap:
      'Human oversight assigned but lacking documented competence requirements and escalation paths.',
    typicalEvidence: [
      'Named human oversight officer with documented competence requirements',
      'Escalation matrix for AI system outputs requiring human review',
      'Training records for oversight personnel',
      'Authority matrix showing override capabilities',
    ],
    remediationTemplate:
      'Appoint a named human oversight officer with documented competence in the AI system’s domain. Define minimum competence requirements, establish a clear escalation matrix, and ensure oversight personnel have authority and technical means to override or suspend the system.',
  },
  aia_art26_5: {
    mostCommonGap:
      'Monitoring relies on provider dashboards without internal incident detection or reporting procedures.',
    typicalEvidence: [
      'Internal monitoring framework aligned with provider instructions',
      'Incident detection and reporting procedure',
      'Market surveillance authority notification protocol',
      'Documented serious incident response plan',
    ],
    remediationTemplate:
      'Establish an internal monitoring framework that complements provider monitoring tools. Define thresholds for risk escalation and incident classification. Document a reporting procedure covering provider notification, market surveillance authority notification, and internal escalation within prescribed timeframes.',
  },
  aia_art26_6: {
    mostCommonGap:
      'Logs retained in provider systems without independent copies or defined retention periods meeting the six-month minimum.',
    typicalEvidence: [
      'Log retention policy specifying minimum six-month period',
      'Technical architecture showing log storage and access controls',
      'Alignment with existing financial services record-keeping requirements',
      'Log integrity verification procedure',
    ],
    remediationTemplate:
      'Implement a log retention policy requiring at least six months of automatically generated logs. Where logs reside in provider systems, establish contractual access rights and independent backup procedures. Align retention with existing financial services record-keeping obligations under MiFID II, Solvency II, or CRD as applicable.',
  },
  aia_art26_9: {
    mostCommonGap:
      'DPIA conducted without referencing AI system transparency information required under Article 13.',
    typicalEvidence: [
      'DPIA referencing Article 13 transparency information from provider',
      'Data processing records updated to reflect AI system data flows',
      'Privacy impact assessment covering AI-specific risks',
      'DPO sign-off on AI system data processing activities',
    ],
    remediationTemplate:
      'Update the existing DPIA or conduct a new one incorporating the transparency information provided under Article 13 of the AI Act. Ensure the assessment covers AI-specific risks including automated decision-making impacts, data quality requirements, and affected person categories. Obtain DPO sign-off.',
  },
};

/* ─── Evidence artefact completeness (mirrors seed-clauses artefact data) ──── */

const CLAUSE_ARTEFACT_COUNTS = {
  clause_art4: { ids: ['ea_art4_1', 'ea_art4_2', 'ea_art4_3', 'ea_art4_4'], matchTerms: { ea_art4_1: ['ai training policy', 'ai literacy policy', 'board approved training', 'ai literacy programme', 'mandatory ai training', 'ai training framework'], ea_art4_2: ['role based training', 'training curriculum', 'completion tracking', 'training matrix', 'training programme'], ea_art4_3: ['annual refresher', 'refresher programme', 'refresher training', 'periodic training', 'recurrent training'], ea_art4_4: ['onboarding module', 'new joiner training', 'induction training', 'onboarding ai'] }, required: ['ea_art4_1', 'ea_art4_2', 'ea_art4_3'] },
  clause_art26_1: { ids: ['ea_art26_1_1', 'ea_art26_1_2', 'ea_art26_1_3', 'ea_art26_1_4'], matchTerms: { ea_art26_1_1: ['operational procedures', 'provider instructions', 'instructions for use', 'standard operating procedure'], ea_art26_1_2: ['change management', 'instruction updates', 'version control', 'change control process'], ea_art26_1_3: ['staff acknowledgement', 'instruction acknowledgement', 'sign off', 'read and understood'], ea_art26_1_4: ['periodic review', 'compliance review', 'regular review', 'usage audit'] }, required: ['ea_art26_1_1', 'ea_art26_1_2', 'ea_art26_1_3'] },
  clause_art26_2: { ids: ['ea_art26_2_1', 'ea_art26_2_2', 'ea_art26_2_3', 'ea_art26_2_4'], matchTerms: { ea_art26_2_1: ['oversight charter', 'governance policy', 'oversight policy', 'ai governance', 'oversight mandate'], ea_art26_2_2: ['role description', 'job description', 'oversight person', 'oversight duties'], ea_art26_2_3: ['training record', 'competence assessment', 'training completion', 'oversight training'], ea_art26_2_4: ['escalation protocol', 'suspension protocol', 'suspend use', 'authority to suspend'] }, required: ['ea_art26_2_1', 'ea_art26_2_2', 'ea_art26_2_3', 'ea_art26_2_4'] },
  clause_art26_4: { ids: ['ea_art26_4_1', 'ea_art26_4_2', 'ea_art26_4_3', 'ea_art26_4_4'], matchTerms: { ea_art26_4_1: ['data quality policy', 'input data quality', 'data quality standards', 'data governance policy'], ea_art26_4_2: ['relevance assessment', 'representativeness assessment', 'data assessment', 'bias assessment'], ea_art26_4_3: ['data monitoring', 'drift detection', 'data drift', 'data quality monitoring'], ea_art26_4_4: ['data correction', 'data remediation', 'correction process', 'data rectification'] }, required: ['ea_art26_4_1', 'ea_art26_4_2', 'ea_art26_4_3'] },
  clause_art26_5: { ids: ['ea_art26_5_1', 'ea_art26_5_2', 'ea_art26_5_3', 'ea_art26_5_4'], matchTerms: { ea_art26_5_1: ['monitoring framework', 'internal monitoring', 'monitoring procedure', 'operational monitoring'], ea_art26_5_2: ['incident detection', 'incident reporting', 'reporting procedure', 'incident management'], ea_art26_5_3: ['market surveillance', 'authority notification', 'surveillance authority', 'regulatory notification'], ea_art26_5_4: ['incident response plan', 'serious incident response', 'response plan', 'crisis management'] }, required: ['ea_art26_5_1', 'ea_art26_5_2', 'ea_art26_5_3', 'ea_art26_5_4'] },
  clause_art26_6: { ids: ['ea_art26_6_1', 'ea_art26_6_2', 'ea_art26_6_3', 'ea_art26_6_4'], matchTerms: { ea_art26_6_1: ['log retention policy', 'retention policy', 'log retention period', 'six month retention'], ea_art26_6_2: ['log storage architecture', 'technical architecture', 'storage infrastructure', 'log management system'], ea_art26_6_3: ['financial services record keeping', 'record keeping alignment', 'regulatory record keeping'], ea_art26_6_4: ['log integrity', 'integrity verification', 'tamper detection', 'log verification procedure'] }, required: ['ea_art26_6_1', 'ea_art26_6_2', 'ea_art26_6_4'] },
  clause_art26_7: { ids: ['ea_art26_7_1', 'ea_art26_7_2', 'ea_art26_7_3'], matchTerms: { ea_art26_7_1: ['worker notification', 'employee notification', 'staff notification', 'workers informed'], ea_art26_7_2: ['works council', 'worker representatives', 'representative consultation', 'trade union consultation'], ea_art26_7_3: ['information document', 'worker information', 'employee information pack', 'worker briefing'] }, required: ['ea_art26_7_1', 'ea_art26_7_2', 'ea_art26_7_3'] },
  clause_art26_9: { ids: ['ea_art26_9_1', 'ea_art26_9_2', 'ea_art26_9_3', 'ea_art26_9_4'], matchTerms: { ea_art26_9_1: ['dpia', 'data protection impact assessment', 'article 13 transparency', 'privacy impact assessment'], ea_art26_9_2: ['data processing records', 'processing activities', 'ropa updated', 'record of processing'], ea_art26_9_3: ['privacy impact assessment', 'ai risk assessment', 'ai specific risks', 'algorithmic impact assessment'], ea_art26_9_4: ['dpo sign off', 'dpo approval', 'data protection officer', 'dpo review'] }, required: ['ea_art26_9_1', 'ea_art26_9_2', 'ea_art26_9_3', 'ea_art26_9_4'] },
  clause_art26_11: { ids: ['ea_art26_11_1', 'ea_art26_11_2', 'ea_art26_11_3'], matchTerms: { ea_art26_11_1: ['transparency notice', 'affected persons notice', 'subject notification', 'ai transparency notice'], ea_art26_11_2: ['communication channel', 'disclosure mechanism', 'notification channel', 'transparency mechanism'], ea_art26_11_3: ['transparency record', 'communication record', 'notification record', 'audit trail'] }, required: ['ea_art26_11_1', 'ea_art26_11_2', 'ea_art26_11_3'] },
  clause_art27_1: { ids: ['ea_art27_1_1', 'ea_art27_1_2', 'ea_art27_1_3', 'ea_art27_1_4'], matchTerms: { ea_art27_1_1: ['fundamental rights impact assessment', 'fria', 'rights impact assessment', 'human rights impact assessment'], ea_art27_1_2: ['affected categories', 'affected persons identification', 'affected groups', 'categories of persons'], ea_art27_1_3: ['risk mitigation measures', 'governance measures', 'complaint mechanism', 'mitigation plan'], ea_art27_1_4: ['fria notification', 'authority notification', 'fria submitted', 'fria filing'] }, required: ['ea_art27_1_1', 'ea_art27_1_2', 'ea_art27_1_3'] },
};

function computeCompletenessScore(clauseRef, controlDesc, evidenceRef) {
  const clauseData = CLAUSE_ARTEFACT_COUNTS[clauseRef];
  if (!clauseData) return null;

  const text = `${controlDesc || ''} ${evidenceRef || ''}`.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;

  const required = clauseData.required;
  let presentCount = 0;
  for (const id of required) {
    const terms = clauseData.matchTerms[id] || [];
    if (terms.some((t) => text.includes(t))) presentCount++;
  }
  return Math.round((presentCount / (required.length || 1)) * 100);
}

const LOADING_PHASES = [
  'Retrieving legal text…',
  'Evaluating evidence…',
  'Checking citation…',
  'Running interpretation…',
];

const EVIDENCE_TYPES = [
  'Policy',
  'Procedure',
  'Technical Control',
  'Record',
  'Training record',
  'Contract',
  'Verbal only',
];

const CONFIDENCE_QUALIFIERS = [
  'Provided in session',
  'To be confirmed',
  'Not yet in place',
];

const CONFIDENCE_MAP = {
  'Provided in session': 'HIGH',
  'To be confirmed': 'MEDIUM',
  'Not yet in place': 'LOW',
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */

const sectionHeading = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  color: '#0F1B2D',
};

const cardClass = 'bg-white border border-gray-200 rounded-lg p-6 shadow-sm';

const btnPrimary =
  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ' +
  'bg-[#1B4B82] hover:bg-[#163d6b]';

const btnSecondary =
  'px-4 py-2 text-sm font-medium text-[#1B4B82] bg-white border border-[#1B4B82] ' +
  'rounded-lg hover:bg-blue-50 transition-colors';

/* ─── Applicability Engine (inline port — same logic as server/classification/applicabilityEngine.js) */

function resolveField(obj, dotPath) {
  return dotPath.split('.').reduce((cur, key) => cur?.[key], obj);
}

function evaluateApplicability(ob, state) {
  const cond = ob.applies_conditions;
  if (!cond) return { applies: true, reason: null, citedBasis: null };
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
  const applies = cond.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  return {
    applies,
    reason: applies ? null : cond.notApplicableBasis || null,
    citedBasis: applies ? null : cond.notApplicableCitation || null,
  };
}

function gateAllObligations(obligations, state) {
  const applicable = [];
  const scopedOut = [];
  for (const ob of obligations) {
    const result = evaluateApplicability(ob, state);
    if (result.applies) {
      applicable.push(ob);
    } else {
      scopedOut.push({ ...ob, ...result });
    }
  }
  return { applicable, scopedOut };
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function ProgressBar({ obligations, assessmentState, currentIndex, onSelect }) {
  const completed = obligations.filter((ob) => {
    const s = assessmentState.obligations.find((o) => o.obligationId === ob.id);
    return s?.status === 'confirmed' || s?.consultantVerdict;
  }).length;

  const dotColor = (ob, idx) => {
    const s = assessmentState.obligations.find((o) => o.obligationId === ob.id);
    if (s?.status === 'confirmed' || s?.consultantVerdict) return 'bg-green-500';
    if (s?.status === 'evaluated') return 'bg-amber-500';
    if (s?.status === 'evidence_captured') return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div className={cardClass} data-testid="obligation-progress">
      <div className="flex items-center gap-2 mb-2">
        {obligations.map((ob, idx) => (
          <button
            key={ob.id}
            onClick={() => onSelect(idx)}
            title={ob.title}
            className={`w-3.5 h-3.5 rounded-full transition-all ${dotColor(ob, idx)} ${
              idx === currentIndex ? 'ring-2 ring-offset-1 ring-[#1B4B82] scale-125' : ''
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {completed} of {obligations.length} complete
      </p>
    </div>
  );
}

function ArticleBadge({ articleRef }) {
  return (
    <span
      className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full"
      style={{ backgroundColor: '#E8EFF7', color: '#1B4B82' }}
    >
      {articleRef}
    </span>
  );
}

function LegalTextBlock({ legalText, articleRef }) {
  return (
    <blockquote className="border-l-4 border-[#1B4B82] pl-4 py-2 bg-gray-50 rounded-r-lg">
      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{legalText}</p>
      <footer className="mt-2 text-xs text-gray-500">
        — {articleRef}, EU AI Act (Regulation 2024/1689)
      </footer>
    </blockquote>
  );
}

function RelatedArticles({ relatedIds, obligations, onNavigate }) {
  if (!relatedIds || relatedIds.length === 0) return null;

  const related = relatedIds
    .map((rid) => {
      const idx = obligations.findIndex((ob) => ob.id === rid);
      return idx >= 0 ? { ...obligations[idx], idx } : null;
    })
    .filter(Boolean);

  if (related.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Related Obligations
      </h4>
      <div className="space-y-1">
        {related.map((r) => (
          <button
            key={r.id}
            onClick={() => onNavigate(r.idx)}
            className="block w-full text-left px-3 py-2 text-sm text-[#1B4B82] hover:bg-blue-50 rounded transition-colors"
          >
            {r.articleRef} — {r.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const config = {
    COMPLIANT: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    PARTIALLY_COMPLIANT: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    NON_COMPLIANT: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    INSUFFICIENT_EVIDENCE: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    CITATION_FAILED: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  };
  const c = config[verdict] || config.INSUFFICIENT_EVIDENCE;
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded border ${c.bg} ${c.text} ${c.border}`}>
      {verdict?.replace(/_/g, ' ')}
    </span>
  );
}

function VerdictCard({ obligationState, obligation }) {
  const er = obligationState?.evaluationResult;
  if (!er) return null;
  const ev = er.evaluation;
  const confidenceLevel = CONFIDENCE_MAP[obligationState.evidence?.confidenceQualifier] || null;

  return (
    <div className={cardClass} data-testid="verdict-card">
      <div className="flex flex-wrap gap-2 mb-4">
        <VerdictBadge verdict={ev.verdict} />
        <ConfidenceBadge confidence={confidenceLevel} />
        <LegalCertaintyBadge certainty={ev.legalCertainty} />
        <CitationVerifiedBadge verified={er.citationVerified} requiresManualVerification={er.requiresManualVerification} />
        <ConsistencyBadge result={obligationState.consistencyResult} />
      </div>

      {ev.requirementsSummary && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-1" style={sectionHeading}>
            Requirements
          </h4>
          <p className="text-sm text-gray-700">{ev.requirementsSummary}</p>
        </div>
      )}

      {ev.sourceCitation && (
        <CitationBlock
          quotedText={ev.sourceCitation.quotedText}
          articleRef={ev.sourceCitation.articleRef}
          sourceDocument={ev.sourceCitation.sourceDocument}
          authorityTier={ev.sourceCitation.authorityTier}
          verified={er.citationVerified}
          requiresManualVerification={er.requiresManualVerification}
        />
      )}

      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-1" style={sectionHeading}>
          Verdict Rationale
        </h4>
        <p className="text-sm text-gray-700">{ev.verdictRationale || ev.reasoning}</p>
      </div>

      {ev.verdict !== 'COMPLIANT' && (ev.gapDescription || ev.gaps) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="text-sm font-semibold text-red-800 mb-1">Gap Identified</h4>
          <p className="text-sm text-red-700">{ev.gapDescription || ev.gaps}</p>
        </div>
      )}

      {ev.remediationGuidance && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">Remediation Guidance</h4>
          <p className="text-sm text-blue-700">{ev.remediationGuidance}</p>
        </div>
      )}

      <PlainLanguageToggle />
      <AlternativeInterpretationPanel />

      {obligationState.interpretationResult && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
          <h4 className="text-sm font-semibold text-purple-800 mb-1">Legal Context</h4>
          <p className="text-sm text-purple-700">
            {typeof obligationState.interpretationResult === 'string'
              ? obligationState.interpretationResult
              : obligationState.interpretationResult.analysis ||
                JSON.stringify(obligationState.interpretationResult)}
          </p>
        </div>
      )}
    </div>
  );
}

function ConsultantControls({ obligationId, obligationState, dispatch }) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState('');
  const [annotation, setAnnotation] = useState('');

  if (obligationState?.status === 'confirmed' || obligationState?.consultantVerdict) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
        <span className="text-green-700 text-sm font-medium">
          {obligationState.consultantVerdict
            ? `✓ Overridden: ${obligationState.consultantVerdict.replace(/_/g, ' ')}`
            : '✓ Confirmed by consultant'}
        </span>
      </div>
    );
  }

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_OBLIGATION', payload: { obligationId } });
  };

  const handleOverride = () => {
    if (!overrideVerdict || !annotation.trim()) return;
    dispatch({
      type: 'CONSULTANT_OVERRIDE',
      payload: {
        obligationId,
        consultantVerdict: overrideVerdict,
        consultantAnnotation: annotation,
      },
    });
    setOverrideMode(false);
  };

  return (
    <div className={cardClass}>
      <div className="flex gap-3">
        <button className={btnPrimary} onClick={handleConfirm}>
          Confirm verdict
        </button>
        <button className={btnSecondary} onClick={() => setOverrideMode(!overrideMode)}>
          Override verdict
        </button>
      </div>
      {overrideMode && (
        <div className="mt-4 space-y-3">
          <select
            value={overrideVerdict}
            onChange={(e) => setOverrideVerdict(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select override verdict…</option>
            <option value="COMPLIANT">COMPLIANT</option>
            <option value="PARTIALLY_COMPLIANT">PARTIALLY COMPLIANT</option>
            <option value="NON_COMPLIANT">NON COMPLIANT</option>
          </select>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            placeholder="Annotation (required)…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24"
          />
          <button
            className={`${btnPrimary} ${!overrideVerdict || !annotation.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleOverride}
            disabled={!overrideVerdict || !annotation.trim()}
          >
            Submit override
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function ObligationAssessment({ assessmentState, dispatch, onComplete, guidance }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlDescription, setControlDescription] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [confidenceQualifier, setConfidenceQualifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState(null);
  const hintMap = useMemo(
    () => Object.fromEntries((guidance?.contextualHints || []).map((hint) => [hint.fieldId, hint.text])),
    [guidance],
  );
  const callout = guidance?.nextBestActions?.[0];

  const { applicable, scopedOut } = useMemo(
    () => gateAllObligations(OBLIGATIONS, assessmentState),
    [assessmentState],
  );

  const currentObligation = applicable[currentIndex];
  const obligationState = assessmentState.obligations.find(
    (o) => o.obligationId === currentObligation?.id
  );
  const archetype = currentObligation ? FS_CONTROL_ARCHETYPES[currentObligation.id] : null;
  const lineGuidance = currentObligation
    ? getLineGuidance(currentObligation.clauseRef, assessmentState.system?.businessLine)
    : null;
  const proofPrompts = currentObligation
    ? getProofPrompts(currentObligation.clauseRef)
    : [];

  useEffect(() => {
    if (!currentObligation) return;
    const existing = assessmentState.obligations.find(
      (o) => o.obligationId === currentObligation.id
    );
    if (existing?.evidence) {
      setControlDescription(existing.evidence.controlDescription || '');
      setEvidenceReference(existing.evidence.evidenceReference || '');
      setEvidenceType(existing.evidence.evidenceType || '');
      setConfidenceQualifier(existing.evidence.confidenceQualifier || '');
    } else {
      setControlDescription('');
      setEvidenceReference('');
      setEvidenceType('');
      setConfidenceQualifier('');
    }
    setError(null);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading) return;
    setLoadingPhase(0);
    const interval = setInterval(() => {
      setLoadingPhase((prev) => Math.min(prev + 1, LOADING_PHASES.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAdoptArchetype = () => {
    if (!archetype || !currentObligation) return;
    setControlDescription(archetype.remediationTemplate);
    setEvidenceType('Procedure');
    dispatch({
      type: 'SET_OBLIGATION_EVIDENCE',
      payload: {
        obligationId: currentObligation.id,
        evidence: {
          controlDescription: archetype.remediationTemplate,
          evidenceReference,
          evidenceType: 'Procedure',
          confidenceQualifier,
        },
      },
    });
  };

  const isFormValid = controlDescription.trim().length >= 80;

  const handleEvaluate = async () => {
    if (!isFormValid || !currentObligation) return;

    const evidence = {
      controlDescription,
      evidenceReference,
      evidenceType,
      confidenceQualifier,
    };

    dispatch({
      type: 'SET_OBLIGATION_EVIDENCE',
      payload: { obligationId: currentObligation.id, evidence },
    });

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId: currentObligation.id,
          obligationTitle: currentObligation.title,
          evidence,
          systemContext: assessmentState.system,
          runInterpretation: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${res.status}`);
      }

      const data = await res.json();

      dispatch({
        type: 'SET_EVALUATION_RESULT',
        payload: { obligationId: currentObligation.id, evaluationResult: data },
      });

      if (data.interpretation) {
        dispatch({
          type: 'SET_INTERPRETATION_RESULT',
          payload: {
            obligationId: currentObligation.id,
            interpretationResult: data.interpretation,
          },
        });
      }

      if (data.consistencyResult) {
        dispatch({
          type: 'SET_CONSISTENCY_RESULT',
          payload: {
            obligationId: currentObligation.id,
            consistencyResult: data.consistencyResult,
          },
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (idx) => {
    if (idx >= 0 && idx < applicable.length) setCurrentIndex(idx);
  };

  if (applicable.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        <h2 className="text-2xl font-bold mb-4" style={sectionHeading}>
          Obligation Assessment
        </h2>
        <p className="text-gray-600">No applicable obligations for this deployment.</p>
        <ApplicabilityGate notApplicableObligations={scopedOut.map((ob) => ({
          clauseId: ob.clauseRef,
          obligationTitle: ob.title,
          articleRef: ob.articleRef,
          reason: ob.reason,
          citedBasis: ob.citedBasis,
        }))} />
      </div>
    );
  }

  const allComplete = applicable.every((ob) => {
    const s = assessmentState.obligations.find((o) => o.obligationId === ob.id);
    return s?.status === 'confirmed' || s?.consultantVerdict;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <h2 className="text-2xl font-bold mb-6" style={sectionHeading}>
        Obligation Assessment
      </h2>

      <ProgressBar
        obligations={applicable}
        assessmentState={assessmentState}
        currentIndex={currentIndex}
        onSelect={handleNavigate}
      />

      {callout && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Next best action
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{callout.label}:</span> {callout.description}
          </p>
        </div>
      )}

      {allComplete && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center space-y-3">
          <p className="text-green-800 font-medium">
            All obligations have been assessed and reviewed.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof onComplete === 'function') onComplete();
            }}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#1B4B82] hover:bg-[#163d6a] transition-colors"
          >
            Continue to Evidence Pack
          </button>
        </div>
      )}

      <div className="flex gap-6 mt-6">
        {/* Left Panel — 40% */}
        <div className="w-2/5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ArticleBadge articleRef={currentObligation.articleRef} />
            <LegalCertaintyBadge certainty={currentObligation.certainty} />
          </div>

          <h3 className="text-lg font-bold" style={sectionHeading}>
            {currentObligation.title}
          </h3>
          <p className="text-sm text-gray-500">{currentObligation.subtitle}</p>

          <LegalTextBlock
            legalText={currentObligation.legalText}
            articleRef={currentObligation.articleRef}
          />

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
              Plain Language
            </h4>
            <p className="text-sm text-blue-900">{currentObligation.plainLanguage}</p>
          </div>

          {lineGuidance && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="line-guidance">
              <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                Business-line guidance
              </h4>
              {lineGuidance.businessLineLabel && (
                <p className="text-xs text-amber-700 mb-2">{lineGuidance.businessLineLabel}</p>
              )}
              <p className="text-sm text-amber-900 mb-3">{lineGuidance.prompt}</p>
              {lineGuidance.suggestedEvidence?.length > 0 && (
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Suggested evidence</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {lineGuidance.suggestedEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {proofPrompts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="proof-prompts">
              <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">
                Proof prompts — what an auditor would ask
              </h4>
              <ol className="list-decimal list-inside space-y-1.5">
                {proofPrompts.map((prompt, idx) => (
                  <li key={idx} className="text-sm text-red-900">{prompt}</li>
                ))}
              </ol>
            </div>
          )}

          {archetype && (
            <ArchetypePanel
              archetype={archetype}
              onAdopt={handleAdoptArchetype}
              systemName={assessmentState.system?.name}
              vendorName={assessmentState.system?.vendor}
            />
          )}

          {(() => {
            const score = computeCompletenessScore(
              currentObligation.clauseRef,
              controlDescription,
              evidenceReference,
            );
            if (score === null) return null;
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Evidence Completeness
                </h4>
                <EvidenceCompletenessBar score={score} size="md" showLabel />
              </div>
            );
          })()}

          <RelatedArticles
            relatedIds={currentObligation.relatedArticleIds}
            obligations={applicable}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Right Panel — 60% */}
        <div className="w-3/5 space-y-4">
          <div className={cardClass}>
            <h4 className="text-base font-semibold mb-4" style={sectionHeading}>
              Evidence Capture
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Control Description <span className="text-red-500">*</span>
                </label>
                {hintMap.controlDescription && (
                  <p className="text-xs text-gray-500 mb-1">{hintMap.controlDescription}</p>
                )}
                <textarea
                  value={controlDescription}
                  onChange={(e) => setControlDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="Describe the controls in place to meet this obligation (min. 80 characters)…"
                />
                <div className="flex justify-between mt-1">
                  <span
                    className={`text-xs ${
                      controlDescription.trim().length >= 80
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {controlDescription.trim().length >= 80
                      ? '✓ Minimum met'
                      : `${80 - controlDescription.trim().length} more characters needed`}
                  </span>
                  <span className="text-xs text-gray-400">{controlDescription.length} chars</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Reference
                </label>
                {hintMap.evidenceReference && (
                  <p className="text-xs text-gray-500 mb-1">{hintMap.evidenceReference}</p>
                )}
                <input
                  type="text"
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  placeholder="Document name, version, date, owner…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evidence Type
                  </label>
                  {hintMap.evidenceType && (
                    <p className="text-xs text-gray-500 mb-1">{hintMap.evidenceType}</p>
                  )}
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  >
                    <option value="">Select type…</option>
                    {EVIDENCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confidence
                  </label>
                  {hintMap.confidenceQualifier && (
                    <p className="text-xs text-gray-500 mb-1">{hintMap.confidenceQualifier}</p>
                  )}
                  <select
                    value={confidenceQualifier}
                    onChange={(e) => setConfidenceQualifier(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  >
                    <option value="">Select confidence…</option>
                    {CONFIDENCE_QUALIFIERS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                data-testid="evaluate-btn"
                onClick={handleEvaluate}
                disabled={!isFormValid || isLoading}
                className={`${btnPrimary} w-full ${
                  !isFormValid || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? LOADING_PHASES[loadingPhase] : 'Evaluate'}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {obligationState?.evaluationResult && (
            <VerdictCard obligationState={obligationState} obligation={currentObligation} />
          )}

          {obligationState?.evaluationResult && (
            <ConsultantControls
              obligationId={currentObligation.id}
              obligationState={obligationState}
              dispatch={dispatch}
            />
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={`${btnSecondary} ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ← Previous
            </button>
            <button
              onClick={() => handleNavigate(currentIndex + 1)}
              disabled={currentIndex >= applicable.length - 1}
              className={`${btnSecondary} ${
                currentIndex >= applicable.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next obligation →
            </button>
          </div>
        </div>
      </div>

      <ApplicabilityGate notApplicableObligations={scopedOut.map((ob) => ({
        clauseId: ob.clauseRef,
        obligationTitle: ob.title,
        articleRef: ob.articleRef,
        reason: ob.reason,
        citedBasis: ob.citedBasis,
      }))} />
    </div>
  );
}
