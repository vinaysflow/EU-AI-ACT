/**
 * Applicability Engine — pure module, zero dependencies.
 *
 * Evaluates whether an obligation applies to a given system based on
 * structured JSON conditions (applies_conditions). Importable on both
 * server and client without any Supabase or Node-specific dependency.
 */

function resolveField(obj, dotPath) {
  return dotPath.split('.').reduce((cur, key) => cur?.[key], obj);
}

function evaluateCondition({ field, op, value }, systemFacts) {
  const v = resolveField(systemFacts, field);

  switch (op) {
    case 'eq':
      return v === value;
    case 'neq':
      return v !== value;
    case 'includes':
      if (typeof v === 'string')
        return v.toLowerCase().includes(String(value).toLowerCase());
      if (Array.isArray(v)) return v.includes(value);
      return false;
    case 'truthy':
      return !!v;
    default:
      return false;
  }
}

/**
 * Evaluate whether a single clause/obligation applies to the system.
 *
 * @param {{ id?: string, clauseRef?: string, applies_conditions: object|null }} clauseRow
 * @param {object} systemFacts — the full assessmentState (or subset) to evaluate against
 * @returns {{ clauseId: string, applies: boolean, reason: string|null, citedBasis: string|null }}
 */
export function evaluateApplicability(clauseRow, systemFacts) {
  const clauseId = clauseRow.id || clauseRow.clauseRef || 'unknown';
  const cond = clauseRow.applies_conditions;

  if (!cond) {
    return { clauseId, applies: true, reason: null, citedBasis: null };
  }

  const results = (cond.required || []).map((c) =>
    evaluateCondition(c, systemFacts),
  );

  const applies =
    cond.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);

  return {
    clauseId,
    applies,
    reason: applies ? null : cond.notApplicableBasis || null,
    citedBasis: applies ? null : cond.notApplicableCitation || null,
  };
}

/**
 * Gate an array of clause/obligation rows against the system facts.
 *
 * @param {object[]} clauses — each must have applies_conditions (or null)
 * @param {object} systemFacts
 * @returns {Array<{ clauseId, applies, reason, citedBasis }>}
 */
export function gateAllObligations(clauses, systemFacts) {
  return clauses.map((clause) => evaluateApplicability(clause, systemFacts));
}
