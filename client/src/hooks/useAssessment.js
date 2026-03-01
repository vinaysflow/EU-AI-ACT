import { useReducer, useEffect, useRef } from 'react';

const STORAGE_KEY = 'eu_ai_act_assessment';

export const initialState = {
  meta: {
    assessmentId: '',
    clientName: '',
    assessmentDate: '',
    leadConsultant: '',
    regulationVersion: 'EU AI Act (Regulation 2024/1689)',
    corpusVersion: '2026-01',
    status: 'draft',
    mode: '',
  },
  scope: {
    operatorRole: '',
    gpaiRole: '',
    euNexus: {
      placedOnEUMarket: false,
      usedInEU: false,
      outputAffectsEUPersons: false,
    },
    riskDomainFlags: [],
    completed: false,
  },
  system: {
    name: '',
    vendor: '',
    modelVersion: '',
    intendedPurpose: '',
    providerStatedPurpose: '',
    deploymentContext: '',
    affectedPersons: '',
    dataTypes: [],
    inputDataController: '',
    operatedBy: '',
    oversightRole: '',
    primarySector: '',
    businessLine: '',
    personsAffectedPerMonth: '',
    affectsEuResidents: '',
    howOutputsUsed: '',
    systemType: '',
    annex3Responses: {},
    art5Responses: {},
    art6_3Responses: {},
    roleResponses: {},
  },
  classification: {
    rulesEngineResult: null,
    explanationResult: null,
    consultantConfirmed: false,
    consultantRationale: '',
  },
  obligations: [],
  evidencePackArtefacts: {},
  remediationBacklog: [],
  synthesis: null,
  consultantReviewComplete: false,
  exportedAt: null,
};

function defaultObligation(id) {
  return {
    obligationId: id,
    evidence: null,
    status: 'pending',
    evaluationResult: null,
    interpretationResult: null,
    plainLanguageResult: null,
    consistencyResult: null,
    matchingArchetypes: null,
    consultantVerdict: null,
    consultantAnnotation: null,
    consultantReviewedAt: null,
  };
}

function updateObligation(obligations, id, updates) {
  const idx = obligations.findIndex((o) => o.obligationId === id);
  if (idx === -1) {
    return [...obligations, { ...defaultObligation(id), ...updates }];
  }
  return obligations.map((o, i) => (i === idx ? { ...o, ...updates } : o));
}

function reducer(state, action) {
  const { type, payload } = action;

  switch (type) {
    case 'SET_META':
      return { ...state, meta: { ...state.meta, ...payload } };

    case 'SET_SCOPE':
      return { ...state, scope: { ...state.scope, ...payload } };

    case 'SET_MODE':
      return { ...state, meta: { ...state.meta, mode: payload } };

    case 'SET_EVIDENCE_ARTEFACT': {
      const key = `${payload.obligationId}:${payload.artefactId}`;
      const prev = state.evidencePackArtefacts || {};
      return {
        ...state,
        evidencePackArtefacts: {
          ...prev,
          [key]: { ...prev[key], ...payload.fields },
        },
      };
    }

    case 'SET_SYSTEM':
      return { ...state, system: { ...state.system, ...payload } };

    case 'SET_SYSTEM_FACTS':
      return { ...state, system: { ...state.system, ...payload } };

    case 'SET_CLASSIFICATION_RULES_RESULT':
      return {
        ...state,
        classification: { ...state.classification, rulesEngineResult: payload },
      };

    case 'SET_CLASSIFICATION_EXPLANATION':
      return {
        ...state,
        classification: { ...state.classification, explanationResult: payload },
      };

    case 'CONFIRM_CLASSIFICATION':
      return {
        ...state,
        classification: {
          ...state.classification,
          consultantConfirmed: true,
          consultantRationale: payload,
        },
      };

    case 'SET_OBLIGATION_EVIDENCE':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          ...payload,
          status: 'evidence_captured',
        }),
      };

    case 'SET_EVALUATION_RESULT':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          evaluationResult: payload.evaluationResult,
          status: 'evaluated',
        }),
      };

    case 'SET_INTERPRETATION_RESULT':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          interpretationResult: payload.interpretationResult,
        }),
      };

    case 'SET_PLAIN_LANGUAGE':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          plainLanguageResult: payload.plainLanguageResult,
        }),
      };

    case 'SET_CONSISTENCY_RESULT':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          consistencyResult: payload.consistencyResult,
        }),
      };

    case 'SET_ARCHETYPE_MATCHES':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          matchingArchetypes: payload.matchingArchetypes,
        }),
      };

    case 'CONSULTANT_OVERRIDE':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          consultantVerdict: payload.consultantVerdict,
          consultantAnnotation: payload.consultantAnnotation,
          consultantReviewedAt: new Date().toISOString(),
        }),
      };

    case 'CONFIRM_OBLIGATION':
      return {
        ...state,
        obligations: updateObligation(state.obligations, payload.obligationId, {
          status: 'confirmed',
          consultantReviewedAt: new Date().toISOString(),
        }),
      };

    case 'ADD_REMEDIATION_ITEM': {
      if (!payload?.id) return state;
      const existing = state.remediationBacklog || [];
      if (existing.some((item) => item.id === payload.id)) return state;
      return { ...state, remediationBacklog: [...existing, payload] };
    }

    case 'SET_SYNTHESIS':
      return { ...state, synthesis: payload };

    case 'MARK_REVIEW_COMPLETE':
      return { ...state, consultantReviewComplete: true };

    case 'SET_EXPORTED':
      return { ...state, exportedAt: payload };

    case 'RESET_ASSESSMENT':
      return { ...initialState };

    default:
      return state;
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted or unavailable — fall through
  }
  return initialState;
}

export function useAssessment() {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable
    }
  }, [state]);

  return [state, dispatch];
}
