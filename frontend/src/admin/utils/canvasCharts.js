// Small dependency-free chart renderer. Draws a pie or grouped-bar chart onto
// an offscreen <canvas> and returns a PNG data URL, so charts can be embedded
// directly into the jsPDF-generated report without needing html2canvas.

export function drawPieChartDataUrl(segments, { size = 420 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * 0.72;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const cx = canvas.height / 2;
  const cy = canvas.height / 2;
  const radius = canvas.height / 2 - 20;

  let startAngle = -Math.PI / 2;
  segments.forEach((seg) => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += angle;
  });

  // Legend
  let legendX = canvas.height + 10;
  let legendY = 30;
  ctx.font = "16px Arial";
  ctx.textBaseline = "middle";
  segments.forEach((seg) => {
    ctx.fillStyle = seg.color;
    ctx.fillRect(legendX, legendY - 8, 16, 16);
    ctx.fillStyle = "#222222";
    const pct = ((seg.value / total) * 100).toFixed(1);
    ctx.fillText(`${seg.label}: ${seg.value} (${pct}%)`, legendX + 24, legendY);
    legendY += 28;
  });

  return canvas.toDataURL("image/png");
}

export function drawBarChartDataUrl(labels, series, { width = 640, height = 320 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const paddingLeft = 50;
  const paddingBottom = 40;
  const paddingTop = 30;
  const chartW = width - paddingLeft - 20;
  const chartH = height - paddingBottom - paddingTop;

  const maxVal = Math.max(1, ...series.flatMap((s) => s.data));

  // Axes
  ctx.strokeStyle = "#999999";
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + chartH);
  ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
  ctx.stroke();

  // Y-axis ticks
  ctx.fillStyle = "#555555";
  ctx.font = "11px Arial";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = Math.round((maxVal / ticks) * i);
    const y = paddingTop + chartH - (val / maxVal) * chartH;
    ctx.fillText(String(val), 5, y + 3);
    ctx.strokeStyle = "#eeeeee";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();
  }

  const groupWidth = chartW / labels.length;
  const barWidth = Math.min(28, (groupWidth * 0.6) / series.length);
  const groupGap = groupWidth * 0.2;

  labels.forEach((label, gi) => {
    const groupStart = paddingLeft + gi * groupWidth + groupGap;
    series.forEach((s, si) => {
      const val = s.data[gi] || 0;
      const barH = (val / maxVal) * chartH;
      const x = groupStart + si * (barWidth + 4);
      const y = paddingTop + chartH - barH;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y, barWidth, barH);
    });
    ctx.fillStyle = "#333333";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, groupStart + (series.length * barWidth) / 2, paddingTop + chartH + 16);
  });
  ctx.textAlign = "left";

  // Legend
  let lx = paddingLeft;
  const ly = 14;
  series.forEach((s) => {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly - 8, 10, 10);
    ctx.fillStyle = "#333333";
    ctx.font = "11px Arial";
    ctx.fillText(s.name, lx + 14, ly);
    lx += ctx.measureText(s.name).width + 40;
  });

  return canvas.toDataURL("image/png");
}
