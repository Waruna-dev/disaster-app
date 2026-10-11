import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfReport {
  title: string; generatedAt: string; summary: { label: string; value: string }[];
  sections: { title: string; headers?: string[]; rows?: (string | number)[][]; bars?: { label: string; value: number }[]; bullets?: string[] }[];
}
const GREEN: [number, number, number] = [8, 119, 95];

/** Builds a real downloadable PDF (no print dialog) with KPIs, bar summaries, tables and decisions. */
export function downloadReportPdf(r: PdfReport, filename = 'operations-report.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  let y = 0;

  doc.setFillColor(...GREEN); doc.rect(0, 0, W, 78, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(r.title, M, 38);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`Generated ${r.generatedAt}`, M, 58);
  y = 104;

  const bw = (W - M * 2 - 12 * (r.summary.length - 1)) / r.summary.length;
  r.summary.forEach((s, i) => {
    const x = M + i * (bw + 12);
    doc.setDrawColor(221, 230, 227); doc.roundedRect(x, y, bw, 52, 6, 6);
    doc.setTextColor(...GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(s.value, x + 10, y + 24);
    doc.setTextColor(100, 122, 118); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(s.label, x + 10, y + 40);
  });
  y += 76;

  const need = (h: number) => { if (y + h > H - 50) { doc.addPage(); y = 50; } };
  r.sections.forEach((s) => {
    need(60);
    doc.setTextColor(20, 61, 57); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(s.title, M, y);
    doc.setDrawColor(...GREEN); doc.setLineWidth(1.5); doc.line(M, y + 5, W - M, y + 5); y += 20;

    if (s.bullets) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(59, 90, 85);
      s.bullets.forEach((b) => { const lines = doc.splitTextToSize(`•  ${b}`, W - M * 2 - 8); need(lines.length * 13); doc.text(lines, M + 4, y); y += lines.length * 13 + 4; });
    }
    if (s.bars?.length) {
      const max = Math.max(1, ...s.bars.map((b) => b.value));
      s.bars.forEach((b) => {
        need(18); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(59, 90, 85);
        doc.text(b.label.slice(0, 26), M, y + 8);
        doc.setFillColor(232, 239, 237); doc.roundedRect(M + 140, y, W - M * 2 - 190, 10, 5, 5, 'F');
        doc.setFillColor(...GREEN); doc.roundedRect(M + 140, y, Math.max(6, ((W - M * 2 - 190) * b.value) / max), 10, 5, 5, 'F');
        doc.setTextColor(20, 61, 57); doc.text(String(b.value), W - M - 36, y + 8); y += 18;
      });
      y += 4;
    }
    if (s.headers && s.rows) {
      autoTable(doc, {
        startY: y, head: [s.headers], body: s.rows.length ? s.rows.map((row) => row.map(String)) : [['No data', ...s.headers.slice(1).map(() => '')]],
        margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: [229, 243, 238], textColor: [20, 61, 57], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 251, 250] }, theme: 'grid',
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    }
    y += 8;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(122, 145, 141); doc.text(`Smart Disaster Early-Warning System · Page ${i} of ${pages}`, W / 2, H - 22, { align: 'center' }); }
  doc.save(filename);
}
