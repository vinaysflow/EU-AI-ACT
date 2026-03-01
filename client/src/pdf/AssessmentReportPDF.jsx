import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { pdfTheme } from './pdfTheme';

const styles = StyleSheet.create({
  page: {
    padding: pdfTheme.marginPage,
    fontFamily: pdfTheme.fontBody,
    fontSize: pdfTheme.sizeBody,
    lineHeight: pdfTheme.lineHeight,
    color: pdfTheme.black,
  },
  heading: {
    fontFamily: pdfTheme.fontBold,
    fontSize: pdfTheme.sizeHeading,
    color: pdfTheme.navy,
    marginBottom: 6,
  },
  subhead: {
    fontFamily: pdfTheme.fontBold,
    fontSize: pdfTheme.sizeSubhead,
    color: pdfTheme.navy,
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 4,
  },
  cell: {
    paddingRight: 8,
  },
  colSmall: { width: '15%' },
  colMed: { width: '25%' },
  colLarge: { width: '45%' },
  badge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: pdfTheme.marginPage,
    right: pdfTheme.marginPage,
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  disclaimer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#0F1B2D',
    color: pdfTheme.white,
    fontSize: 8,
  },
  section: {
    marginBottom: 12,
  },
  blockquote: {
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1B4B82',
    paddingLeft: 8,
    fontStyle: 'italic',
    color: '#475569',
  },
  riskCritical: { color: '#7F1D1D', fontFamily: pdfTheme.fontBold },
  riskHigh: { color: '#B91C1C', fontFamily: pdfTheme.fontBold },
});

const ALL_SECTIONS = new Set(['A', 'B', 'C', 'D', 'E', 'F']);

function getEvaluationResult(obligation) {
  return obligation?.evaluationResult?.evaluation || obligation?.evaluationResult || {};
}

function normaliseObligations(assessmentState) {
  return (assessmentState?.obligations || []).map((o) => {
    const ev = getEvaluationResult(o);
    return {
      obligationId: o.obligationId || o.id,
      obligationTitle: o.obligationTitle || o.title || '',
      articleRef: ev.articleRef || o.articleRef || '',
      verdict: o.consultantVerdict || ev.verdict || 'NOT_EVALUATED',
      riskSeverity: ev.riskSeverity || '',
      legalCertainty: ev.legalCertainty || '',
      gapDescription: ev.gapDescription || '',
      requirementsSummary: ev.requirementsSummary || '',
      remediationGuidance: ev.remediationGuidance || '',
      citationVerified: o.evaluationResult?.citationVerified ?? ev.citationVerified ?? null,
      requiresManualVerification: o.evaluationResult?.requiresManualVerification ?? ev.requiresManualVerification ?? null,
      consistencyFlag: o.consistencyResult?.consistencyFlag || null,
      sourceCitation: ev.sourceCitation || null,
      sourceChunks: o.evaluationResult?.sourceChunks || null,
      plainLanguageResult: o.plainLanguageResult || o.evaluationResult?.plainLanguage || null,
    };
  });
}

function buildGapRows(assessmentState, obligations) {
  const synthesis = assessmentState?.synthesis;
  if (synthesis?.gapRegister?.length) return synthesis.gapRegister;
  const GAP = new Set(['NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'INSUFFICIENT_EVIDENCE', 'CITATION_FAILED']);
  return obligations
    .filter((o) => GAP.has(o.verdict))
    .map((o) => ({
      obligationId: o.obligationId,
      articleRef: o.articleRef,
      obligationTitle: o.obligationTitle,
      gapDescription: o.gapDescription || '',
      severity: o.riskSeverity || 'MEDIUM',
      effort: 'M',
      requiresLegalReview: ['CONTESTED', 'UNRESOLVED'].includes(o.legalCertainty),
      citationVerified: o.citationVerified === true,
      requiresManualVerification: o.requiresManualVerification === true,
    }));
}

function resolveSections(sections) {
  if (!sections || sections.length === 0) return ALL_SECTIONS;
  return new Set(sections.map((s) => s.toUpperCase()));
}

export default function AssessmentReportPDF({ assessmentState, artefactData, reportMetadata, sections }) {
  const active = resolveSections(sections);

  const system = artefactData?.A?.system || assessmentState?.system || {};
  const meta = assessmentState?.meta || {};
  const classification = artefactData?.A?.classificationResult
    || assessmentState?.classification?.rulesEngineResult
    || null;
  const obligations = artefactData?.C
    ? artefactData.C.map((o) => ({
      obligationId: o.obligationId,
      obligationTitle: o.obligationTitle,
      articleRef: o.articleRef,
      verdict: o.verdict,
      riskSeverity: o.riskSeverity,
      legalCertainty: o.legalCertainty,
      gapDescription: o.gapDescription,
      requirementsSummary: o.requirementsSummary,
      remediationGuidance: o.remediationGuidance,
      citationVerified: o.citationVerified,
      requiresManualVerification: o.requiresManualVerification,
      consistencyFlag: o.consistencyFlag,
      sourceCitation: { quotedText: o.quotedText },
      plainLanguageResult: null,
    }))
    : normaliseObligations(assessmentState);
  const gapRows = artefactData?.D || buildGapRows(assessmentState, obligations);
  const synthesis = artefactData?.E || assessmentState?.synthesis || {};
  const reportDate = reportMetadata?.generatedAt?.slice(0, 10) || meta.assessmentDate || new Date().toISOString().slice(0, 10);
  const systemName = reportMetadata?.systemName || system.name || 'System';

  const appendix = artefactData?.F || obligations.map((o) => ({
    obligationId: o.obligationId,
    articleRef: o.articleRef,
    obligationTitle: o.obligationTitle,
    tier1Text: o.sourceChunks?.tier1?.chunk_text || null,
    supportingChunks: (o.sourceChunks?.bridgeContext || []).map((c) => ({
      id: c.id,
      text: c.chunk_text,
    })),
    quotedText: o.sourceCitation?.quotedText || null,
    quotedChunkId: o.sourceCitation?.chunkId || null,
    citationVerified: o.citationVerified,
    requiresManualVerification: o.requiresManualVerification,
  }));

  const footerLine = `EU AI Act Compliance Assessment | ${systemName} | ${reportDate} | Preliminary - Not Legal Advice | Corpus 2026-01`;

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>EU AI Act Compliance Assessment</Text>
        <Text>System: {system.name || 'Unnamed system'}</Text>
        <Text>Classification: {classification?.finalClassification || 'Not classified'}</Text>
        <Text>Date: {reportDate}</Text>
        <Text>Consultant: {meta.leadConsultant || 'Unassigned'}</Text>
        {active.size < ALL_SECTIONS.size && (
          <Text style={{ marginTop: 8, fontSize: 9, color: '#64748B' }}>
            Sections included: {[...active].sort().join(', ')}
          </Text>
        )}
        <View style={styles.disclaimer}>
          <Text>PRELIMINARY ASSESSMENT ONLY. Not legal advice.</Text>
        </View>
        <Text style={styles.footer} fixed>{footerLine}</Text>
      </Page>

      {/* Artefact A */}
      {active.has('A') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact A - AI System Register</Text>
          <View style={styles.section}>
            <Text style={styles.label}>System identity</Text>
            <Text>Name: {system.name || '-'}</Text>
            <Text>Vendor: {system.vendor || '-'}</Text>
            <Text>Model/version: {system.modelVersion || '-'}</Text>
            <Text>Intended purpose: {system.intendedPurpose || '-'}</Text>
            <Text>Deployment context: {system.deploymentContext || '-'}</Text>
            <Text>Primary sector: {system.primarySector || '-'}</Text>
            <Text>Corpus version: 2026-01</Text>
            <Text>Retrieval mode: bridgeContext</Text>
          </View>
          <Text style={styles.subhead}>Rules engine output</Text>
          <Text style={styles.blockquote}>{JSON.stringify(classification || {}, null, 2)}</Text>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}

      {/* Artefact B */}
      {active.has('B') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact B - Risk Classification Decision Record</Text>
          <View style={styles.section}>
            <Text style={styles.subhead}>Steps</Text>
            <Text>{JSON.stringify(classification || {}, null, 2)}</Text>
          </View>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}

      {/* Artefact C */}
      {active.has('C') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact C - Compliance Assessment Matrix</Text>
          <View>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.colSmall]}>Article</Text>
              <Text style={[styles.cell, styles.colMed]}>Verdict</Text>
              <Text style={[styles.cell, styles.colLarge]}>Gap / Summary</Text>
            </View>
            {obligations.map((o) => (
              <View style={styles.row} key={o.obligationId}>
                <Text style={[styles.cell, styles.colSmall]}>{o.articleRef}</Text>
                <Text style={[styles.cell, styles.colMed]}>{o.verdict}</Text>
                <Text style={[styles.cell, styles.colLarge]}>{o.gapDescription || o.requirementsSummary}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}

      {/* Artefact D */}
      {active.has('D') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact D - Gap Register</Text>
          <View>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.colSmall]}>Article</Text>
              <Text style={[styles.cell, styles.colMed]}>Severity</Text>
              <Text style={[styles.cell, styles.colLarge]}>Gap</Text>
            </View>
            {gapRows.map((g, idx) => (
              <View style={styles.row} key={`${g.articleRef}-${idx}`}>
                <Text style={[styles.cell, styles.colSmall]}>{g.articleRef}</Text>
                <Text style={[styles.cell, styles.colMed]}>{g.severity}</Text>
                <Text style={[styles.cell, styles.colLarge]}>{g.gapDescription}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}

      {/* Artefact E */}
      {active.has('E') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact E - Executive Summary</Text>
          <Text>{synthesis.executiveSummaryOpening || '-'}</Text>
          <View style={styles.section}>
            {obligations
              .filter((o) => o.verdict === 'NON_COMPLIANT' && ['HIGH', 'CRITICAL'].includes(o.riskSeverity))
              .map((o) => (
                <View key={o.obligationId} style={{ marginTop: 6 }}>
                  <Text style={o.riskSeverity === 'CRITICAL' ? styles.riskCritical : styles.riskHigh}>
                    {o.articleRef} - {o.obligationTitle}
                  </Text>
                  <Text>{o.plainLanguageResult?.headline || o.gapDescription}</Text>
                </View>
              ))}
          </View>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}

      {/* Artefact F */}
      {active.has('F') && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>Artefact F - Citation Appendix</Text>
          {appendix.map((o) => (
            <View key={o.obligationId} style={styles.section}>
              <Text style={styles.subhead}>{o.articleRef} - {o.obligationTitle}</Text>
              <Text style={styles.label}>Tier 1 text</Text>
              <Text style={styles.blockquote}>{o.tier1Text || '-'}</Text>
              <Text style={styles.label}>Quoted text</Text>
              <Text style={styles.blockquote}>{o.quotedText || '-'}</Text>
              <Text>Verified: {String(o.citationVerified)}</Text>
              <Text>Manual verification required: {String(o.requiresManualVerification)}</Text>
              <Text>Source: EU AI Act (Regulation 2024/1689), OJ L 12.7.2024</Text>
              <Text>Corpus version: 2026-01 | Retrieval mode: bridgeContext (Phase 1)</Text>
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.subhead}>Consultant signature</Text>
            <Text>Reviewed and signed by: {meta.leadConsultant || '________________'}</Text>
            <Text>Assessment date: {meta.assessmentDate || new Date().toISOString().slice(0, 10)}</Text>
            <Text>This assessment is preliminary. All findings require qualified legal review.</Text>
            <Text>Regulation (EU) 2024/1689, OJ L 12.7.2024.</Text>
          </View>
          <Text style={styles.footer} fixed>{footerLine}</Text>
        </Page>
      )}
    </Document>
  );
}
