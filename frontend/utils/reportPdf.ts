import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface PdfSection {
  title: string;
  headers?: string[];
  rows?: (string | number)[][];
  bars?: { label: string; value: number }[];
  bullets?: string[];
}

export interface PdfReport {
  title: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  sections: PdfSection[];
}

const esc = (s: string | number) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildReportHtml(report: PdfReport): string {
  const summary = report.summary
    .map((s) => `<div class="kpi"><div class="kpi-v">${esc(s.value)}</div><div class="kpi-l">${esc(s.label)}</div></div>`)
    .join('');

  const sections = report.sections
    .map((sec) => {
      let body = '';
      if (sec.bars?.length) {
        const max = Math.max(1, ...sec.bars.map((b) => b.value));
        body += sec.bars
          .map(
            (b) =>
              `<div class="bar-row"><span class="bar-l">${esc(b.label)}</span><span class="bar-t"><span class="bar-f" style="width:${(b.value / max) * 100}%"></span></span><span class="bar-v">${esc(b.value)}</span></div>`
          )
          .join('');
      }
      if (sec.headers && sec.rows) {
        body += `<table><thead><tr>${sec.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
          sec.rows.length
            ? sec.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${sec.headers.length}" style="text-align:center;color:#8A9C99">No data</td></tr>`
        }</tbody></table>`;
      }
      if (sec.bullets?.length) body += `<ul>${sec.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
      return `<div class="section"><h2>${esc(sec.title)}</h2>${body}</div>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1B2B28;padding:28px;}
    h1{color:#0B7A66;margin:0 0 4px;font-size:22px} .sub{color:#647A76;font-size:12px;margin-bottom:18px}
    .kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
    .kpi{flex:1;min-width:110px;border:1px solid #DDE6E3;border-radius:10px;padding:10px 12px}
    .kpi-v{font-size:20px;font-weight:800;color:#0B7A66}.kpi-l{font-size:11px;color:#647A76}
    .section{margin-bottom:20px;page-break-inside:avoid} h2{font-size:14px;border-bottom:2px solid #0B7A66;padding-bottom:4px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;font-size:11px} th{background:#E8F5F2;text-align:left;padding:6px 8px} td{padding:6px 8px;border-bottom:1px solid #EEF3F1}
    .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px}.bar-l{width:130px}.bar-t{flex:1;background:#EEF3F1;height:10px;border-radius:5px;overflow:hidden}
    .bar-f{display:block;height:10px;background:#0B7A66}.bar-v{width:40px;text-align:right;font-weight:700}
    li{font-size:12px;margin-bottom:5px;line-height:1.4}
  </style></head><body>
    <h1>${esc(report.title)}</h1><div class="sub">Generated ${esc(report.generatedAt)}</div>
    <div class="kpis">${summary}</div>${sections}
  </body></html>`;
}

/** Web: opens the browser print dialog ("Save as PDF"). Native: renders a PDF file and opens the share sheet. */
export async function exportReportPdf(report: PdfReport): Promise<void> {
  const html = buildReportHtml(report);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Operations Report' });
  }
}
