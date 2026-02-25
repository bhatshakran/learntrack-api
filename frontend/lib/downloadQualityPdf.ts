import { QualityReport } from "@/components/dashboard/types";
import jsPDF from "jspdf";

export function downloadQualityReportPDF(quality: QualityReport) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString();
  let y = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const rule = (color = "#1e293b") => {
    doc.setDrawColor(color);
    doc.line(40, y, W - 40, y);
    y += 1;
  };
  const gap = (n = 12) => {
    y += n;
  };

  // ── Dark background ───────────────────────────────────────────────────────
  doc.setFillColor("#0f172a");
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor("#1e293b");
  doc.roundedRect(0, 0, W, 70, 0, 0, "F");

  y = 32;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#a78bfa");
  doc.text("LearnTrack", 40, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#94a3b8");
  doc.text("Data Quality Report", 40, y + 18);

  doc.setFontSize(9);
  doc.setTextColor("#475569");
  doc.text(`Generated ${now}`, W - 40, y + 18, { align: "right" });

  // Status badge
  const totalAnomalies =
    (Array.isArray(quality.anomalies.progress_over_100)
      ? quality.anomalies.progress_over_100.length
      : quality.anomalies.progress_over_100) +
    (Array.isArray(quality.anomalies.progress_under_0)
      ? quality.anomalies.progress_under_0.length
      : quality.anomalies.progress_under_0) +
    quality.anomalies.orphaned_completions +
    quality.anomalies.duplicate_completions +
    quality.anomalies.inconsistent_progress;

  const isClean = totalAnomalies === 0;
  doc.setFillColor(isClean ? "#052e16" : "#2d0a0a");
  doc.roundedRect(W - 140, 16, 100, 22, 4, 4, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isClean ? "#4ade80" : "#f87171");
  doc.text(
    isClean ? "✓ All Clear" : `${totalAnomalies} Issues Found`,
    W - 90,
    31,
    { align: "center" },
  );

  y = 90;

  // ── Summary row ───────────────────────────────────────────────────────────
  const summaryCards = [
    {
      label: "Enrollments Checked",
      value: String(quality.total_enrollments_checked),
      color: "#a78bfa",
    },
    {
      label: "Total Anomalies",
      value: String(totalAnomalies),
      color: isClean ? "#4ade80" : "#f87171",
    },
    {
      label: "Report Status",
      value: isClean ? "Clean" : "Needs Attention",
      color: isClean ? "#4ade80" : "#fbbf24",
    },
  ];

  const cardW = (W - 80 - 20) / 3;
  summaryCards.forEach((card, i) => {
    const x = 40 + i * (cardW + 10);
    doc.setFillColor("#1e293b");
    doc.roundedRect(x, y, cardW, 52, 6, 6, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#64748b");
    doc.text(card.label, x + 12, y + 17);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(card.color);
    doc.text(card.value, x + 12, y + 40);
  });

  y += 72;

  // ── Anomalies section ─────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#94a3b8");
  doc.text("ANOMALY BREAKDOWN", 40, y);
  gap(4);
  rule("#334155");
  gap(14);

  const ANOMALIES = [
    {
      label: "Progress Over 100%",
      value: Array.isArray(quality.anomalies.progress_over_100)
        ? quality.anomalies.progress_over_100.length
        : quality.anomalies.progress_over_100,
      desc: "Enrollments with corrupted progress exceeding maximum",
      icon: "↑",
    },
    {
      label: "Progress Under 0%",
      value: Array.isArray(quality.anomalies.progress_under_0)
        ? quality.anomalies.progress_under_0.length
        : quality.anomalies.progress_under_0,
      desc: "Enrollments with negative progress values",
      icon: "↓",
    },
    {
      label: "Orphaned Completions",
      value: quality.anomalies.orphaned_completions,
      desc: "Completions pointing to lessons that no longer exist",
      icon: "⌀",
    },
    {
      label: "Duplicate Completions",
      value: quality.anomalies.duplicate_completions,
      desc: "Same lesson marked complete more than once",
      icon: "+",
    },
    {
      label: "Inconsistent Progress",
      value: quality.anomalies.inconsistent_progress,
      desc: "Stored progress doesn't match actual completed lessons",
      icon: "≠",
    },
  ];

  ANOMALIES.forEach((a, i) => {
    const hasIssue = a.value > 0;
    const rowColor = hasIssue ? "#2d0a0a" : "#0f1f0f";
    const rowH = 38;

    doc.setFillColor(rowColor);
    doc.roundedRect(40, y, W - 80, rowH, 4, 4, "F");

    // Left accent line
    doc.setFillColor(hasIssue ? "#ef4444" : "#22c55e");
    doc.rect(40, y, 3, rowH, "F");

    // Icon
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(hasIssue ? "#f87171" : "#4ade80");
    doc.text(a.icon, 55, y + 24);

    // Label
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(hasIssue ? "#fca5a5" : "#d1fae5");
    doc.text(a.label, 75, y + 16);

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#475569");
    doc.text(a.desc, 75, y + 28);

    // Value
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(hasIssue ? "#f87171" : "#4ade80");
    doc.text(String(a.value), W - 55, y + 25, { align: "right" });

    y += rowH + 6;
    if (i < ANOMALIES.length - 1) gap(0);
  });

  // ── Details section ───────────────────────────────────────────────────────
  if (quality.details && quality.details.length > 0) {
    gap(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#94a3b8");
    doc.text("DETAILS", 40, y);
    gap(4);
    rule("#334155");
    gap(14);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quality.details.forEach((d: any) => {
      const pageH = doc.internal.pageSize.getHeight();
      if (y > pageH - 60) {
        doc.addPage();
        doc.setFillColor("#0f172a");
        doc.rect(0, 0, W, pageH, "F");
        y = 40;
      }

      doc.setFillColor("#1e293b");
      doc.roundedRect(40, y, W - 80, 30, 3, 3, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#f87171");
      doc.text(`[${d.type}]`, 52, y + 13);

      doc.setFont("helvetica", "normal");
      doc.setTextColor("#94a3b8");

      const parts: string[] = [];
      if (d.enrollment_id)
        parts.push(`enrollment: ${d.enrollment_id.slice(0, 8)}…`);
      if (d.lesson_id) parts.push(`lesson: ${d.lesson_id.slice(0, 8)}…`);
      if (d.stored_progress != null)
        parts.push(`stored: ${d.stored_progress}%`);
      if (d.actual_progress != null)
        parts.push(`actual: ${d.actual_progress}%`);
      if (d.difference != null)
        parts.push(`diff: ${d.difference > 0 ? "+" : ""}${d.difference}%`);
      if (d.count != null) parts.push(`×${d.count}`);

      doc.text(parts.join("   "), 52, y + 24);
      y += 38;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor("#1e293b");
  doc.rect(0, pageH - 30, W, 30, "F");
  doc.setFontSize(8);
  doc.setTextColor("#334155");
  doc.text("LearnTrack Admin · Confidential", 40, pageH - 12);
  doc.text(`Page 1`, W - 40, pageH - 12, { align: "right" });

  // ── Save ──────────────────────────────────────────────────────────────────
  //   const filename = `learntrack-quality-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  //   doc.save(filename);
  // Open in new window
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}
