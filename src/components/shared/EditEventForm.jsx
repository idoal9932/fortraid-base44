import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";

const STEPS = ["מדדים", "תיאור קליני"];

function parseTreatmentField(raw) {
  const backgroundMatch = raw.match(/רקע: ([^\n]+)/);
  const hpiMatch = raw.match(/מחלה נוכחית: ([^\n]+)/);
  const examMatch = raw.match(/בדיקה גופנית: ([^\n]+)/);
  const treatmentMatch = raw.match(/טיפול: ([^\n]+)/);
  return {
    background: backgroundMatch ? backgroundMatch[1] : "",
    hpi: hpiMatch ? hpiMatch[1] : "",
    physical_exam: examMatch ? examMatch[1] : "",
    treatment_given: treatmentMatch ? treatmentMatch[1] : "",
  };
}

export default function EditEventForm({ event, onSaved, onCancel }) {
  const bpParts = (event.vitals_bp || "").split("/");
  const parsed = parseTreatmentField(event.treatment_given || "");

  const [step, setStep] = useState(0);
  const [vitals, setVitals] = useState({
    hr: event.vitals_hr ? String(event.vitals_hr) : "",
    bp_sys: bpParts[0] || "",
    bp_dia: bpParts[1] || "",
    spo2: event.vitals_spo2 ? String(event.vitals_spo2) : "",
    temp: event.vitals_temp ? String(event.vitals_temp) : "",
    gcs: event.vitals_gcs ? String(event.vitals_gcs) : "",
  });
  const [clinical, setClinical] = useState({
    chief_complaint: event.chief_complaint || "",
    background: parsed.background,
    hpi: parsed.hpi,
    physical_exam: parsed.physical_exam,
    treatment_given: parsed.treatment_given,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const bp = vitals.bp_sys && vitals.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : "";
    await base44.entities.MedicalEvent.update(event.id, {
      chief_complaint: clinical.chief_complaint,
      vitals_bp: bp,
      vitals_hr: vitals.hr ? Number(vitals.hr) : undefined,
      vitals_spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
      vitals_temp: vitals.temp ? Number(vitals.temp) : undefined,
      vitals_gcs: vitals.gcs ? Number(vitals.gcs) : undefined,
      treatment_given: [
        clinical.background ? `רקע: ${clinical.background}` : "",
        clinical.hpi ? `מחלה נוכחית: ${clinical.hpi}` : "",
        clinical.physical_exam ? `בדיקה גופנית: ${clinical.physical_exam}` : "",
        clinical.treatment_given ? `טיפול: ${clinical.treatment_given}` : "",
      ].filter(Boolean).join("\n"),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">עריכת דוח</h1>
          <button onClick={onCancel}><X className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-primary px-4 pb-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-white" : "bg-white/30"}`} />
              <p className={`text-xs mt-1 text-center ${i <= step ? "text-white font-semibold" : "text-white/50"}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-4">
        {step === 0 && (
          <div className="space-y-5">
            <VitalField label="דופק" unit="bpm" value={vitals.hr} onChange={(v) => setVitals({ ...vitals, hr: v })} placeholder="75" />
            <div>
              <p className="text-lg font-semibold mb-2">לחץ דם (mmHg)</p>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">סיסטולי</p>
                  <input type="number" inputMode="numeric" value={vitals.bp_sys}
                    onChange={(e) => setVitals({ ...vitals, bp_sys: e.target.value })} placeholder="120"
                    className="w-full h-16 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card" />
                </div>
                <span className="text-3xl font-bold text-muted-foreground mt-4">/</span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">דיאסטולי</p>
                  <input type="number" inputMode="numeric" value={vitals.bp_dia}
                    onChange={(e) => setVitals({ ...vitals, bp_dia: e.target.value })} placeholder="80"
                    className="w-full h-16 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card" />
                </div>
              </div>
            </div>
            <VitalField label="סטורציה" unit="%" value={vitals.spo2} onChange={(v) => setVitals({ ...vitals, spo2: v })} placeholder="98" />
            <VitalField label="חום גוף" unit="°C" value={vitals.temp} onChange={(v) => setVitals({ ...vitals, temp: v })} placeholder="37.0" decimal />
            <VitalField label="GCS (אופציונלי)" unit="/15" value={vitals.gcs} onChange={(v) => setVitals({ ...vitals, gcs: v })} placeholder="15" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <ClinicalField label="תלונה עיקרית *" value={clinical.chief_complaint}
              onChange={(v) => setClinical({ ...clinical, chief_complaint: v })}
              placeholder="למשל: הקאות ושלשולים מזה יומיים" rows={3} />
            <ClinicalField label="רקע רפואי" value={clinical.background}
              onChange={(v) => setClinical({ ...clinical, background: v })}
              placeholder="מחלות, תרופות קבועות, רגישויות" rows={3} />
            <ClinicalField label="מחלה נוכחית" value={clinical.hpi}
              onChange={(v) => setClinical({ ...clinical, hpi: v })}
              placeholder="תאר את מהלך המחלה..." rows={5} />
            <ClinicalField label="בדיקה גופנית" value={clinical.physical_exam}
              onChange={(v) => setClinical({ ...clinical, physical_exam: v })}
              placeholder="ממצאי בדיקה גופנית רלוונטיים" rows={3} />
            <ClinicalField label="טיפול שניתן (אופציונלי)" value={clinical.treatment_given}
              onChange={(v) => setClinical({ ...clinical, treatment_given: v })}
              placeholder="תרופות, עירוי, חבישה..." rows={2} />
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-4 pb-safe pt-3 max-w-2xl mx-auto w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="h-16 text-lg px-5" onClick={() => setStep(0)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
          {step === 0 ? (
            <Button className="flex-1 h-16 text-xl font-bold" onClick={() => setStep(1)}>הבא</Button>
          ) : (
            <Button className="flex-1 h-16 text-xl font-bold" disabled={saving || !clinical.chief_complaint} onClick={handleSave}>
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function VitalField({ label, unit, value, onChange, placeholder, decimal }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-lg font-semibold">{label}</p>
        <span className="text-muted-foreground text-base">{unit}</span>
      </div>
      <input type="number" inputMode={decimal ? "decimal" : "numeric"}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-16 text-3xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card" />
    </div>
  );
}

function ClinicalField({ label, value, onChange, placeholder, rows }) {
  return (
    <div>
      <p className="text-lg font-semibold mb-2">{label}</p>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full p-4 text-lg border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card resize-none" />
    </div>
  );
}