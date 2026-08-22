import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawPieChartDataUrl, drawBarChartDataUrl } from "./canvasCharts";
import logoUrl from "../../assets/floodguard-logo.png";

function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function disasterLabel(incidentType) {
  const map = {
    flood: "Flood",
    landslide: "Landslide",
    "heavy-rain": "Heavy Rain",
    fire: "Fire",
    "road-block": "Road Block",
    medical: "Medical",
    "power-outage": "Power Outage",
    other: "Other",
  };
  return map[incidentType] || incidentType;
}

function reportIdOf(report) {
  return `RPT${report._id.slice(-6).toUpperCase()}`;
}

/**
 * Builds and downloads the Pending Reports "Report Generate" PDF:
 * heading + counts + approve/reject pie & bar charts + 7-day daily analysis
 * charts + analysis description + full approved/rejected reports table +
 * summary + signature block.
 */
export async function generateAdminReportPdf({ adminEmail, summary, reviewedReports }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 40;

  // --- Header ---
  try {
    const logo = await loadImageAsDataUrl(logoUrl);
    const logoW = 46;
    const logoH = (logo.height / logo.width) * logoW;
    doc.addImage(logo.dataUrl, "PNG", margin, y, logoW, logoH);
  } catch {
    // Logo failed to load (e.g. offline build) — continue without it.
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 74, 198);
  doc.text("FloodGuard", margin + 56, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("Your Shield Against the Water", margin + 56, y + 34);

  const now = new Date();
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Date: ${now.toLocaleDateString()}`, pageWidth - margin, y + 12, { align: "right" });
  doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - margin, y + 24, { align: "right" });
  doc.text(`Admin: ${adminEmail || "admin@gmail.com"}`, pageWidth - margin, y + 36, { align: "right" });

  y += 60;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 28;

  // --- Title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text("Pending Reports Verification Report", margin, y);
  y += 26;

  // --- Counts ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const counts = [
    `Pending Reports: ${summary.pendingReports}`,
    `Approved Reports: ${summary.approvedReports}`,
    `Rejected Reports: ${summary.rejectedReports}`,
  ];
  counts.forEach((c, i) => {
    doc.text(c, margin + i * 175, y);
  });
  y += 26;

  // --- Overall approve vs reject: pie + bar ---
  const overallSegments = [
    { label: "Approved", value: summary.approvedReports, color: "#2e7d32" },
    { label: "Rejected", value: summary.rejectedReports, color: "#ba1a1a" },
  ];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Approved vs Rejected Reports", margin, y);
  y += 10;

  const pieDataUrl = drawPieChartDataUrl(overallSegments, { size: 380 });
  const barDataUrl = drawBarChartDataUrl(
    ["Approved", "Rejected"],
    [{ name: "Count", color: "#004ac6", data: [summary.approvedReports, summary.rejectedReports] }],
    { width: 380, height: 220 }
  );
  doc.addImage(pieDataUrl, "PNG", margin, y, 250, 172);
  doc.addImage(barDataUrl, "PNG", margin + 265, y, 250, 145);
  y += 190;

  // --- Daily analysis: pie + bar (last 7 days) ---
  const daily = summary.dailyAnalysis && summary.dailyAnalysis.length ? summary.dailyAnalysis : [];
  const dailyApproved = daily.reduce((s, d) => s + (d.approved || 0), 0);
  const dailyRejected = daily.reduce((s, d) => s + (d.rejected || 0), 0);

  if (y > 620) {
    doc.addPage();
    y = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Daily Analysis - Last 7 Days (Approve vs Reject)", margin, y);
  y += 10;

  const dailyPieUrl = drawPieChartDataUrl(
    [
      { label: "Approved", value: dailyApproved, color: "#2e7d32" },
      { label: "Rejected", value: dailyRejected, color: "#ba1a1a" },
    ],
    { size: 380 }
  );
  const dailyBarUrl = drawBarChartDataUrl(
    daily.length ? daily.map((d) => d.date.slice(5)) : ["No data"],
    [
      { name: "Approved", color: "#2e7d32", data: daily.length ? daily.map((d) => d.approved) : [0] },
      { name: "Rejected", color: "#ba1a1a", data: daily.length ? daily.map((d) => d.rejected) : [0] },
    ],
    { width: 380, height: 220 }
  );
  doc.addImage(dailyPieUrl, "PNG", margin, y, 250, 172);
  doc.addImage(dailyBarUrl, "PNG", margin + 265, y, 250, 145);
  y += 200;

  // --- Analysis description ---
  if (y > 650) {
    doc.addPage();
    y = 40;
  }
  const approvalRate = summary.approvedReports + summary.rejectedReports > 0
    ? ((summary.approvedReports / (summary.approvedReports + summary.rejectedReports)) * 100).toFixed(1)
    : "0.0";
  const analysisText =
    `Out of ${summary.approvedReports + summary.rejectedReports} reviewed reports, ` +
    `${summary.approvedReports} (${approvalRate}%) were verified and approved while ` +
    `${summary.rejectedReports} were rejected. ${summary.pendingReports} report(s) remain pending review. ` +
    `Over the last 7 days, ${dailyApproved} report(s) were approved and ${dailyRejected} were rejected, ` +
    `indicating the current pace of the admin verification workflow.`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Analysis Description", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const analysisLines = doc.splitTextToSize(analysisText, pageWidth - margin * 2);
  doc.text(analysisLines, margin, y);
  y += analysisLines.length * 13 + 16;

  // --- Reports table ---
  if (y > 700) {
    doc.addPage();
    y = 40;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Approved & Rejected Reports", margin, y);
  y += 10;

  const tableRows = reviewedReports.map((r) => [
    reportIdOf(r),
    disasterLabel(r.incidentType),
    r.locationName || (r.location ? `${r.location.lat?.toFixed(3)}, ${r.location.lng?.toFixed(3)}` : "N/A"),
    new Date(r.createdAt).toLocaleString(),
    r.reportedByName || "Anonymous",
    (r.severity || "medium").toUpperCase(),
    r.approvalStatus === "approved" ? "Approved" : "Rejected",
    r.approvalStatus === "rejected" ? r.rejectReason || "-" : "-",
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [["Report ID", "Disaster", "Location", "Time", "Reported By", "Severity", "Status", "Reject Reason"]],
    body: tableRows.length ? tableRows : [["-", "No reviewed reports yet", "-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [0, 74, 198], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 24;

  // --- Summary + signature ---
  if (y > 700) {
    doc.addPage();
    y = 40;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Summary", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(
    `This report was generated automatically from the FloodGuard Pending Reports dashboard. ` +
      `All figures reflect verified data at the time of generation and are intended for internal ` +
      `disaster-response record keeping.`,
    pageWidth - margin * 2
  );
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 13 + 40;

  if (y > 740) {
    doc.addPage();
    y = 60;
  }
  doc.line(margin, y, margin + 200, y);
  doc.text("Administrator Signature", margin, y + 14);
  doc.line(margin + 260, y, margin + 400, y);
  doc.text(`Date: ${now.toLocaleDateString()}`, margin + 260, y + 14);
  doc.line(margin + 420, y, margin + 520, y);
  doc.text(`Time: ${now.toLocaleTimeString()}`, margin + 420, y + 14);

  doc.save(`FloodGuard_Pending_Reports_${now.toISOString().slice(0, 10)}.pdf`);
}
