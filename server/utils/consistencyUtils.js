const TARGET_VERDICTS = new Set(['NON_COMPLIANT', 'PARTIALLY_COMPLIANT']);
const TARGET_SEVERITIES = new Set(['HIGH', 'CRITICAL']);
const HIGH_SEVERITY = new Set(['HIGH', 'CRITICAL']);
const LOW_SEVERITY = new Set(['LOW', 'NONE']);

function isCompliantVerdict(verdict) {
  return verdict === 'COMPLIANT';
}

function isAdjacentGapVerdictPair(v1, v2) {
  return (
    (v1 === 'NON_COMPLIANT' && v2 === 'PARTIALLY_COMPLIANT') ||
    (v1 === 'PARTIALLY_COMPLIANT' && v2 === 'NON_COMPLIANT')
  );
}

export function shouldRunConsistencyCheck(evaluation) {
  if (!evaluation) return false;
  return (
    evaluation.legalCertainty === 'CLEAR_TEXT' &&
    TARGET_VERDICTS.has(evaluation.verdict) &&
    TARGET_SEVERITIES.has(evaluation.riskSeverity)
  );
}

export function analyseVerdictDivergence(v1, v2) {
  if (!v1 || !v2 || v1 === v2) {
    return { divergent: false, type: null, note: null };
  }
  if (isAdjacentGapVerdictPair(v1, v2)) {
    return { divergent: false, type: null, note: null };
  }
  if (isCompliantVerdict(v1) !== isCompliantVerdict(v2)) {
    return {
      divergent: true,
      type: 'MODEL_INCONSISTENT',
      note: `Crossed COMPLIANT boundary (${v1} vs ${v2}).`,
    };
  }
  return { divergent: false, type: null, note: null };
}

export function analyseSeverityDivergence(s1, s2, v1, v2) {
  if (!s1 || !s2 || s1 === s2) {
    return { divergent: false, type: null, note: null };
  }
  if (s1 === 'MEDIUM' || s2 === 'MEDIUM') {
    return { divergent: false, type: null, note: null };
  }
  const highLowSwing =
    (HIGH_SEVERITY.has(s1) && LOW_SEVERITY.has(s2)) ||
    (HIGH_SEVERITY.has(s2) && LOW_SEVERITY.has(s1));
  if (!highLowSwing) {
    return { divergent: false, type: null, note: null };
  }
  return {
    divergent: true,
    type: 'SEVERITY_INCONSISTENT',
    note: `Severity swung across HIGH/CRITICAL and LOW/NONE (${s1} vs ${s2}).`,
  };
}

export function computeConsistencyOutcome(firstPass, secondPass) {
  if (
    firstPass?.verdict === 'CITATION_FAILED' ||
    secondPass?.verdict === 'CITATION_FAILED'
  ) {
    return {
      firstPass,
      secondPass,
      consistent: false,
      consistencyFlag: 'SKIPPED_CITATION_FAILED',
      divergences: {
        verdict: null,
        severity: null,
      },
      note: 'Consistency check skipped because at least one pass ended CITATION_FAILED.',
      recommendation: null,
    };
  }

  const verdict = analyseVerdictDivergence(firstPass?.verdict, secondPass?.verdict);
  const severity = analyseSeverityDivergence(
    firstPass?.riskSeverity,
    secondPass?.riskSeverity,
    firstPass?.verdict,
    secondPass?.verdict,
  );

  if (verdict.divergent && severity.divergent) {
    return {
      firstPass,
      secondPass,
      consistent: false,
      consistencyFlag: 'MODEL_AND_SEVERITY_INCONSISTENT',
      divergences: {
        verdict: verdict.note,
        severity: severity.note,
      },
      note: 'Both verdict and severity diverged across passes.',
      recommendation: 'Escalate to consultant review before relying on this finding.',
    };
  }
  if (verdict.divergent) {
    return {
      firstPass,
      secondPass,
      consistent: false,
      consistencyFlag: 'MODEL_INCONSISTENT',
      divergences: {
        verdict: verdict.note,
        severity: null,
      },
      note: 'Verdict divergence detected across passes.',
      recommendation: 'Consultant should determine final verdict after review.',
    };
  }
  if (severity.divergent) {
    return {
      firstPass,
      secondPass,
      consistent: false,
      consistencyFlag: 'SEVERITY_INCONSISTENT',
      divergences: {
        verdict: null,
        severity: severity.note,
      },
      note: 'Severity divergence detected with aligned verdict.',
      recommendation: 'Consultant should calibrate final severity rating.',
    };
  }

  return {
    firstPass,
    secondPass,
    consistent: true,
    consistencyFlag: 'CONSISTENT',
    divergences: {
      verdict: null,
      severity: null,
    },
    note: 'Both passes are consistent under deterministic divergence rules.',
    recommendation: null,
  };
}
