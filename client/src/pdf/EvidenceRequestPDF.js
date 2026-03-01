import { pdfTheme as t } from './pdfTheme';

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scoreColor(s) {
  if (s >= 70) return '#16A34A';
  if (s >= 40) return '#D97706';
  return '#DC2626';
}

function buildHTML(packData, state) {
  const systemName = esc(state.system?.name || 'Unnamed System');
  const consultant = esc(state.meta?.leadConsultant || '');
  const date = state.meta?.assessmentDate || new Date().toISOString().slice(0, 10);
  const synthesis = state.synthesis || {};

  const allCross = [];
  const seen = new Set();
  for (const p of packData) {
    for (const ins of p.crossClauseInsights || []) {
      if (!seen.has(ins.artefactId)) {
        seen.add(ins.artefactId);
        allCross.push(ins);
      }
    }
  }

  let html = '';

  // Cover page
  html += `
    <div style="page-break-after:always; text-align:center; padding-top:120px;">
      <h1 style="font-family:Georgia,serif; font-size:22px; color:${t.navy}; margin-bottom:8px;">
        EU AI Act — Evidence Request
      </h1>
      <p style="font-size:13px; color:#475569; margin-bottom:4px;">
        Deployer Obligation Evidence Pack
      </p>
      <hr style="width:200px; margin:16px auto; border:none; border-top:2px solid ${t.navy};" />
      <p style="font-size:${t.sizeSubhead}px; font-weight:bold; margin-bottom:4px;">${systemName}</p>
      <p style="font-size:${t.sizeBody}px; color:#64748B;">${date}</p>
      ${consultant ? `<p style="font-size:${t.sizeBody}px; color:#64748B;">Lead consultant: ${consultant}</p>` : ''}
      <div style="margin:40px auto 0; max-width:480px; background:${t.navy}; color:${t.white}; padding:10px 16px; font-size:9px; text-align:left; border-radius:4px;">
        PRELIMINARY ASSESSMENT ONLY — This document identifies evidence artefacts required to demonstrate EU AI Act deployer obligation compliance. It is not legal advice. All findings require qualified legal review before being relied upon.
      </div>
    </div>`;

  // Cross-obligation efficiency section
  if (allCross.length > 0) {
    html += `
      <h2 style="font-family:Georgia,serif; font-size:${t.sizeHeading}px; color:${t.navy}; border-bottom:1px solid #E2E8F0; padding-bottom:4px;">
        Cross-Obligation Efficiency
      </h2>
      <p style="font-size:${t.sizeBody}px; color:#475569; margin-bottom:8px;">
        The following artefacts each satisfy requirements across multiple obligations. Prioritising these delivers the highest compliance return per document.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:35%;">Artefact</th>
            <th style="width:25%;">Primary Obligation</th>
            <th style="width:40%;">Also Satisfies</th>
          </tr>
        </thead>
        <tbody>
          ${allCross.map((ins) => `
            <tr>
              <td style="font-weight:600;">${esc(ins.artefactName)}</td>
              <td>${esc(ins.primaryClause.replace('clause_', '').replace(/_/g, ' '))}</td>
              <td>${(ins.alsoSatisfiesTitles || []).map((t2) => esc(t2)).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // Per-obligation sections
  const sorted = [...packData].sort((a, b) => a.completenessScore - b.completenessScore);
  for (const item of sorted) {
    const sc = item.completenessScore;
    const scCol = scoreColor(sc);
    const missing = item.missingArtefacts || [];
    const present = (item.evidenceArtefacts || []).filter((a) => a.matchResult?.status === 'PRESENT');

    html += `
      <div style="page-break-inside:avoid; margin-top:16px;">
        <h2 style="font-family:Georgia,serif; font-size:${t.sizeHeading}px; color:${t.navy}; border-bottom:1px solid #E2E8F0; padding-bottom:4px;">
          ${esc(item.articleRef)} — ${esc(item.obligationTitle)}
        </h2>
        <p style="font-size:${t.sizeBody}px;">
          Evidence completeness: <strong style="color:${scCol};">${sc}%</strong>
        </p>`;

    if (missing.length > 0) {
      html += `
        <h3 style="font-family:Georgia,serif; font-size:12px; color:#991B1B; margin-top:8px;">Missing Artefacts</h3>
        <ol style="font-size:${t.sizeBody}px; padding-left:20px; color:#991B1B;">
          ${missing.map((a) => `<li style="margin-bottom:4px;"><strong>${esc(a.name)}</strong><br/><span style="color:#64748B; font-size:9px;">${esc(a.description)}</span></li>`).join('')}
        </ol>`;
    }

    if (present.length > 0) {
      html += `
        <h3 style="font-family:Georgia,serif; font-size:12px; color:#166534; margin-top:8px;">Present Artefacts</h3>
        <ul style="font-size:${t.sizeBody}px; padding-left:20px; color:#166534;">
          ${present.map((a) => `<li>${esc(a.name)}</li>`).join('')}
        </ul>`;
    }

    html += `</div>`;
  }

  // Final page — synthesis
  if (synthesis.executiveSummaryOpening || (synthesis.criticalPath && synthesis.criticalPath.length > 0)) {
    html += `
      <div style="page-break-before:always;">
        <h2 style="font-family:Georgia,serif; font-size:${t.sizeHeading}px; color:${t.navy}; border-bottom:1px solid #E2E8F0; padding-bottom:4px;">
          Executive Context
        </h2>`;

    if (synthesis.executiveSummaryOpening) {
      html += `<p style="font-size:${t.sizeBody}px; line-height:1.6; margin-bottom:12px;">${esc(synthesis.executiveSummaryOpening)}</p>`;
    }

    const cp = (synthesis.criticalPath || []).slice(0, 3);
    if (cp.length > 0) {
      html += `
        <h3 style="font-family:Georgia,serif; font-size:12px; color:${t.navy}; margin-top:10px;">Critical Path (Top ${cp.length})</h3>
        <ol style="font-size:${t.sizeBody}px; padding-left:20px;">
          ${cp.map((c) => `<li style="margin-bottom:4px;">${esc(c)}</li>`).join('')}
        </ol>`;
    }

    html += `</div>`;
  }

  return html;
}

export function generateEvidenceRequestPDF(packData, assessmentState) {
  const systemName = assessmentState.system?.name || 'Unnamed System';
  const body = buildHTML(packData, assessmentState);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Evidence Request — ${esc(systemName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Georgia&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: ${t.fontBody}, Inter, sans-serif; font-size: ${t.sizeBody}px; color: ${t.black}; padding: 24px 32px; line-height: ${t.lineHeight}; }
  h1 { font-family: Georgia, serif; font-size: 18px; color: ${t.navy}; margin-bottom: 6px; }
  h2 { font-family: Georgia, serif; font-size: ${t.sizeHeading}px; color: ${t.navy}; margin: 16px 0 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  h3 { font-family: Georgia, serif; font-size: 12px; color: #334155; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: ${t.sizeBody}px; }
  th { background: ${t.navy}; color: ${t.white}; text-align: left; padding: 4px 6px; font-weight: 600; }
  td { padding: 4px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 6px 32px; font-size: 8px; color: #64748B; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 12px; }
    .footer { position: fixed; bottom: 0; }
  }
</style></head><body>
${body}
<div class="footer">
  <span>EU AI Act — Evidence Request | ${esc(systemName)}</span>
  <span>Corpus 2026-01 | Preliminary — Not Legal Advice</span>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
