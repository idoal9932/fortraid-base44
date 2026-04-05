import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Camera, Image as ImageIcon } from "lucide-react";

function VitalInput({ label, unit, value, onChange, placeholder, decimal }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-base font-semibold">{label}</p>
        <span className="text-muted-foreground text-sm">{unit}</span>
      </div>
      <input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
      />
    </div>
  );
}

export default function AddCheckupForm({ patientId, authorName, latestEventId, onSaved, onCancel, onSaveError }) {
  const [vitals, setVitals] = useState({ hr: "", bp_sys: "", bp_dia: "", spo2: "", temp: "", glucose: "" });
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 1500);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = () => {
    // Optimistic: הצג הצלחה וסגור מיידית
    showToast("הבדיקה נוספה ✓");
    setTimeout(() => onSaved(), 800);

    // שמירה ברקע
    const bp = vitals.bp_sys && vitals.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : "";
    const doSave = async () => {
      let image_url = "";
      if (imageFile) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile });
        image_url = res.file_url;
      }
      const checkup = await base44.entities.Checkup.create({
        patient_id: patientId,
        event_id: latestEventId || "",
        author_name: authorName || "",
        vitals_hr: vitals.hr ? Number(vitals.hr) : undefined,
        vitals_bp: bp,
        vitals_spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
        vitals_temp: vitals.temp ? Number(vitals.temp) : undefined,
        vitals_glucose: vitals.glucose ? Number(vitals.glucose) : undefined,
        note,
        image_url,
      });
      base44.functions.invoke('notifyDoctorsOnCheckup', {
        patient_id: patientId,
        checkup_id: checkup.id,
        author_name: authorName,
        vitals_hr: vitals.hr,
        vitals_bp: bp,
        vitals_spo2: vitals.spo2,
        vitals_temp: vitals.temp,
        vitals_glucose: vitals.glucose,
        note,
      }).catch(() => {});
    };
    doSave().catch(() => {
      onSaveError?.("שגיאה בשמירה, נסה שוב");
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
              background: toastMsg?.isError ? "#dc2626" : "#1e2a38", borderRadius: 12, padding: "12px 20px",
              color: "#fff", fontSize: 15, fontWeight: 600,
              zIndex: 50, whiteSpace: "nowrap", pointerEvents: "none"
            }}
          >
            {toastMsg?.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="bg-primary text-primary-foreground px-4 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">הוסף בדיקה</h1>
        <button onClick={onCancel}><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-5">
        <VitalInput label="דופק" unit="bpm" value={vitals.hr} onChange={(v) => setVitals({ ...vitals, hr: v })} placeholder="75" />
        <div>
          <p className="text-base font-semibold mb-1">לחץ דם (mmHg)</p>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">סיסטולי</p>
              <input type="number" inputMode="numeric" value={vitals.bp_sys}
                onChange={(e) => setVitals({ ...vitals, bp_sys: e.target.value })} placeholder="120"
                className="w-full h-14 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card" />
            </div>
            <span className="text-3xl font-bold text-muted-foreground mt-4">/</span>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">דיאסטולי</p>
              <input type="number" inputMode="numeric" value={vitals.bp_dia}
                onChange={(e) => setVitals({ ...vitals, bp_dia: e.target.value })} placeholder="80"
                className="w-full h-14 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card" />
            </div>
          </div>
        </div>
        <VitalInput label="סטורציה" unit="%" value={vitals.spo2} onChange={(v) => setVitals({ ...vitals, spo2: v })} placeholder="98" />
        <VitalInput label="חום גוף" unit="°C" value={vitals.temp} onChange={(v) => setVitals({ ...vitals, temp: v })} placeholder="37.0" decimal />
        <VitalInput label="סוכר" unit="mg/dL" value={vitals.glucose} onChange={(v) => setVitals({ ...vitals, glucose: v })} placeholder="100" />

        <div>
          <p className="text-base font-semibold mb-1">הערה / תיאור</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה חופשית..." rows={3}
            className="w-full p-3 text-base border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card resize-none" />
        </div>

        <div>
          <p className="text-base font-semibold mb-2">תמונה (אופציונלי)</p>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-full rounded-xl object-cover max-h-48" />
              <button className="absolute top-2 left-2 bg-black/60 rounded-full p-1" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <ImageIcon className="w-6 h-6" />
                <span className="text-sm">גלריה</span>
              </button>
              <button onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Camera className="w-6 h-6" />
                <span className="text-sm">מצלמה</span>
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
        </div>
      </div>

      <div className="px-4 pt-3 max-w-2xl mx-auto w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>
        <Button className="w-full h-16 text-xl font-bold relative overflow-hidden" onClick={handleSave} disabled={saving}>
          {saving && (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.22)", pointerEvents: "none" }}
            />
          )}
          {saving ? "שומר..." : "שמור בדיקה"}
        </Button>
      </div>
    </div>
  );
}