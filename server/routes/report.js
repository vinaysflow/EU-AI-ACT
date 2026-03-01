import { Router } from 'express';
import XLSX from 'xlsx-js-style';
import {
  formatAllArtefacts,
  formatArtefactA,
  formatArtefactB,
  formatArtefactC,
  formatArtefactD,
  formatArtefactE,
  formatArtefactF,
} from '../utils/reportFormatter.js';

const router = Router();

const ALLOWED_ARTEFACTS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'ALL', 'EVIDENCE_REQUEST']);
const ALLOWED_FORMATS = new Set(['json', 'pdf', 'excel']);

function buildReportMetadata(assessmentState) {
  return {
    corpusVersion: '2026-01',
    retrievalMode: 'bridgeContext',
    generatedAt: new Date().toISOString(),
    systemName: assessmentState?.system?.name || null,
  };
}

function artefactDataFor(assessmentState, artefact) {
  if (artefact === 'ALL') return formatAllArtefacts(assessmentState);
  if (artefact === 'EVIDENCE_REQUEST') {
    return {
      C: formatArtefactC(assessmentState),
      D: formatArtefactD(assessmentState),
    };
  }
  if (artefact === 'A') return formatArtefactA(assessmentState);
  if (artefact === 'B') return formatArtefactB(assessmentState);
  if (artefact === 'C') return formatArtefactC(assessmentState);
  if (artefact === 'D') return formatArtefactD(assessmentState);
  if (artefact === 'E') return formatArtefactE(assessmentState);
  if (artefact === 'F') return formatArtefactF(assessmentState);
  return null;
}

function isMissingArtefactData(artefact, data) {
  if (!data) return true;
  if (artefact === 'ALL' || artefact === 'EVIDENCE_REQUEST') return Object.keys(data).length === 0;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '0F1B2D' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  },
};

const DATA_STYLE = {
  font: { sz: 10 },
  alignment: { vertical: 'top', wrapText: true },
  border: {
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
  },
};

const SEVERITY_FILLS = {
  CRITICAL: { fgColor: { rgb: '7F1D1D' } },
  HIGH:     { fgColor: { rgb: 'FEE2E2' } },
  MEDIUM:   { fgColor: { rgb: 'FEF3C7' } },
  LOW:      { fgColor: { rgb: 'DCFCE7' } },
};

const SEVERITY_FONTS = {
  CRITICAL: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  HIGH:     { bold: true, color: { rgb: '991B1B' }, sz: 10 },
  MEDIUM:   { bold: true, color: { rgb: '92400E' }, sz: 10 },
  LOW:      { bold: true, color: { rgb: '166534' }, sz: 10 },
};

const GAP_COLUMNS = [
  { header: 'Priority',               key: 'priority',                   width: 10 },
  { header: 'Article',                key: 'articleRef',                 width: 16 },
  { header: 'Obligation',             key: 'obligationTitle',            width: 30 },
  { header: 'Gap Description',        key: 'gapDescription',            width: 50 },
  { header: 'Severity',               key: 'severity',                  width: 12 },
  { header: 'Effort',                 key: 'effort',                    width: 10 },
  { header: 'Suggested Owner',        key: 'suggestedOwner',            width: 22 },
  { header: 'Target Date',            key: 'targetDate',                width: 16 },
  { header: 'Requires Legal Review',  key: 'requiresLegalReview',       width: 20 },
  { header: 'Citation Verified',      key: 'citationVerified',          width: 18 },
  { header: 'Manual Verification',    key: 'requiresManualVerification', width: 20 },
  { header: 'Consistency Flag',       key: 'consistencyFlag',           width: 22 },
  { header: 'Archetype Template',     key: 'archetypeTemplate',         width: 30 },
];

function buildStyledExcel(rows, assessmentState) {
  const wb = XLSX.utils.book_new();

  const wsData = [GAP_COLUMNS.map((c) => c.header)];
  for (const row of rows) {
    wsData.push(GAP_COLUMNS.map((c) => {
      const v = row[c.key];
      if (v == null) return '';
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      return String(v);
    }));
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  for (let col = 0; col < GAP_COLUMNS.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) ws[cellRef].s = HEADER_STYLE;
  }

  const severityColIdx = GAP_COLUMNS.findIndex((c) => c.key === 'severity');
  for (let r = 1; r <= rows.length; r++) {
    for (let c = 0; c < GAP_COLUMNS.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      if (c === severityColIdx) {
        const sev = ws[cellRef].v;
        ws[cellRef].s = {
          ...DATA_STYLE,
          fill: SEVERITY_FILLS[sev] || {},
          font: SEVERITY_FONTS[sev] || DATA_STYLE.font,
        };
      } else {
        ws[cellRef].s = DATA_STYLE;
      }
    }
  }

  ws['!cols'] = GAP_COLUMNS.map((c) => ({ wch: c.width }));

  XLSX.utils.book_append_sheet(wb, ws, 'Gap Register');

  const system = assessmentState?.system || {};
  const meta = assessmentState?.meta || {};
  const metaRows = [
    ['EU AI Act Compliance Assessment - Gap Register'],
    [],
    ['System Name', system.name || ''],
    ['Vendor', system.vendor || ''],
    ['Assessment Date', meta.assessmentDate || new Date().toISOString().slice(0, 10)],
    ['Lead Consultant', meta.leadConsultant || ''],
    ['Corpus Version', '2026-01'],
    ['Retrieval Mode', 'bridgeContext'],
    [],
    ['PRELIMINARY ASSESSMENT ONLY - Not legal advice.'],
    ['Regulation (EU) 2024/1689, OJ L 12.7.2024'],
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaRows);
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (metaWs[titleRef]) {
    metaWs[titleRef].s = {
      font: { bold: true, sz: 14, color: { rgb: '0F1B2D' } },
    };
  }
  metaWs['!cols'] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

router.post('/', async (req, res) => {
  const { assessmentState, artefact, format } = req.body || {};

  if (!assessmentState) {
    return res.status(400).json({ error: 'assessmentState is required' });
  }
  if (!artefact || !ALLOWED_ARTEFACTS.has(artefact)) {
    return res.status(400).json({ error: 'artefact is required and must be A, B, C, D, E, F, ALL, or EVIDENCE_REQUEST' });
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    return res.status(400).json({ error: 'format is required and must be pdf, json, or excel' });
  }
  if (format === 'excel' && artefact !== 'D') {
    return res.status(400).json({ error: 'excel format is only valid for artefact D' });
  }

  try {
    const artefactData = artefactDataFor(assessmentState, artefact);
    if (isMissingArtefactData(artefact, artefactData)) {
      return res.status(422).json({ error: `Missing data for artefact ${artefact}` });
    }

    const reportMetadata = buildReportMetadata(assessmentState);

    if (format === 'json') {
      return res.json({ artefact, artefactData, reportMetadata });
    }

    if (format === 'pdf') {
      return res.json({ artefact, artefactData, reportMetadata });
    }

    const rows = formatArtefactD(assessmentState);
    if (!rows.length) {
      return res.status(422).json({ error: 'Missing data for artefact D' });
    }

    const xlsxBuffer = buildStyledExcel(rows, assessmentState);
    const base64 = Buffer.from(xlsxBuffer).toString('base64');
    return res.json({
      artefact: 'D',
      format: 'excel',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'gap-register.xlsx',
      base64,
      reportMetadata,
    });
  } catch (err) {
    res.locals.error = err.message;
    res.status(503).json({ error: err.message });
  }
});

router.post('/evidence-pack', async (req, res) => {
  const { assessmentState, format } = req.body || {};

  if (!assessmentState) {
    return res.status(400).json({ error: 'assessmentState is required' });
  }
  if (!format || !['csv', 'json'].includes(format)) {
    return res.status(400).json({ error: 'format must be csv or json' });
  }

  try {
    const obligations = assessmentState.obligations || [];
    const artefactMeta = assessmentState.evidencePackArtefacts || {};
    const OBLIGATION_META = {
      aia_art4:     { articleRef: 'Article 4',    title: 'AI Literacy' },
      aia_art26_1:  { articleRef: 'Article 26(1)', title: 'Use per Instructions' },
      aia_art26_2:  { articleRef: 'Article 26(2)', title: 'Human Oversight' },
      aia_art26_4:  { articleRef: 'Article 26(4)', title: 'Input Data Quality' },
      aia_art26_5:  { articleRef: 'Article 26(5)', title: 'Monitoring & Incident Reporting' },
      aia_art26_6:  { articleRef: 'Article 26(6)', title: 'Log Retention' },
      aia_art26_7:  { articleRef: 'Article 26(7)', title: 'Worker Notification' },
      aia_art26_9:  { articleRef: 'Article 26(9)', title: 'GDPR DPIA Bridge' },
      aia_art26_11: { articleRef: 'Article 26(11)', title: 'Affected Persons Transparency' },
      aia_art27_1:  { articleRef: 'Article 27(1)', title: 'Fundamental Rights Impact Assessment' },
    };

    const rows = obligations.map((obl) => {
      const meta = OBLIGATION_META[obl.obligationId] || {};
      const ev = obl.evaluationResult?.evaluation || obl.evaluationResult || {};
      const verdict = obl.consultantVerdict || ev.verdict || 'NOT_EVALUATED';
      const oblMeta = artefactMeta;
      const artefactKeys = Object.keys(oblMeta)
        .filter((k) => k.startsWith(`${obl.obligationId}:`));
      const artefactDetails = artefactKeys.map((k) => ({
        artefactId: k.split(':')[1],
        ...oblMeta[k],
      }));

      return {
        obligationId: obl.obligationId,
        articleRef: meta.articleRef || '',
        title: meta.title || '',
        verdict,
        status: obl.status || 'pending',
        artefacts: artefactDetails,
      };
    });

    if (format === 'json') {
      const reportMetadata = buildReportMetadata(assessmentState);
      return res.json({ evidencePack: rows, reportMetadata });
    }

    const csvHeaders = [
      'Obligation ID', 'Article', 'Title', 'Verdict', 'Status',
      'Artefact ID', 'Owner', 'Artefact Status', 'Evidence URL', 'Reviewer',
    ];
    const csvRows = [csvHeaders.join(',')];
    for (const obl of rows) {
      if (obl.artefacts.length === 0) {
        csvRows.push([
          obl.obligationId, obl.articleRef, `"${obl.title}"`, obl.verdict, obl.status,
          '', '', '', '', '',
        ].join(','));
      } else {
        for (const a of obl.artefacts) {
          csvRows.push([
            obl.obligationId, obl.articleRef, `"${obl.title}"`, obl.verdict, obl.status,
            a.artefactId || '', a.owner || '', a.status || '', a.evidenceUrl || '', a.reviewer || '',
          ].join(','));
        }
      }
    }

    const csvText = csvRows.join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=evidence-pack.csv');
    return res.send(csvText);
  } catch (err) {
    res.locals.error = err.message;
    res.status(503).json({ error: err.message });
  }
});

export default router;
