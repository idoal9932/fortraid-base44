import React, { useState } from "react";
import { format } from "date-fns";

function buildReport(event) {
  const lines = [];

  lines.push("🔴 דוח רפואי");

  if (event.event_date) {
    lines.push(`📅 ${format(new Date(event.event_date), "dd/MM/yyyy HH:mm")}`);
  }
  if (event.site_name) {
    lines.push(`📍 אתר: ${event.site_name}`);
  }
  if (event.patient_name) {
    lines.push(`👤 ${event.patient_name}`);
  }

  if (event.chief_complaint) {
    lines.push("");
    lines.push("*תלונה עיקרית*");
    lines.push(event.chief_complaint);
  }

  // Parse treatment_given back into sections (stored as "רקע: ...\nמחלה נוכחית: ...\n...")
  const treatmentRaw = event.treatment_given || "";
  const backgroundMatch = treatmentRaw.match(/רקע: ([^\n]+)/);
  const hpiMatch = treatmentRaw.match(/מחלה נוכחית: ([^\n]+)/);
  const examMatch = treatmentRaw.match(/בדיקה גופנית: ([^\n]+)/);
  const treatmentMatch = treatmentRaw.match(/טיפול: ([^\n]+)/);

  if (backgroundMatch) {
    lines.push("");
    lines.push("*רקע רפואי*");
    lines.push(backgroundMatch[1]);
  }

  if (hpiMatch) {
    lines.push("");
    lines.push("*מחלה נוכחית*");
    lines.push(hpiMatch[1]);
  }

  // Vitals
  const vitals = [];
  if (event.vitals_hr) vitals.push(`דופק ${event.vitals_hr} bpm`);
  if (event.vitals_bp) vitals.push(`ל"ד ${event.vitals_bp} mmHg`);
  if (event.vitals_spo2) vitals.push(`סטורציה ${event.vitals_spo2}%`);
  if (event.vitals_temp) vitals.push(`חום ${event.vitals_temp}°C`);

  const examLine = examMatch ? examMatch[1] : "";

  if (vitals.length > 0 || examLine) {
    lines.push("");
    lines.push("*בדיקה גופנית*");
    if (vitals.length > 0) lines.push(`מדדים: ${vitals.join(" | ")}`);
    if (examLine) lines.push(examLine);
  }

  if (treatmentMatch) {
    lines.push("");
    lines.push("*טיפול שניתן*");
    lines.push(treatmentMatch[1]);
  }

  if (event.paramedic_name) {
    lines.push("");
    lines.push(`— ${event.paramedic_name}`);
  }

  return lines.join("\n");
}

export default function CopyToWhatsApp({ event, imageCount = 0 }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let text = buildReport(event);
    
    if (imageCount > 0) {
      text += `\n\n📎 ${imageCount} תמונות מצורפות — ראה באפליקציה`;
    }
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-green-500 text-green-600 font-semibold text-base hover:bg-green-50 transition-all active:scale-[0.98]"
    >
      {copied ? "✅ הועתק!" : "📋 העתק לוואטסאפ"}
    </button>
  );
}