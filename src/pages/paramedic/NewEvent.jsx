import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

import { AlertCircle, CheckCircle, ChevronRight, Camera, Trash2 } from "lucide-react";
import PatientSearch from "@/components/shared/PatientSearch";
import NewPatientForm from "@/components/shared/NewPatientForm";

const STEPS = ["מטופל", "מדדים", "תיאור קליני"];

export default function NewEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [patientSubStep, setPatientSubStep] = useState("search"); // "search" | "create"
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState({ hr: "", bp_sys: "", bp_dia: "", spo2: "", temp: "", glucose: "" });
  const [clinical, setClinical] = useState({ chief_complaint: "", background: "", hpi: "", physical_exam: "", treatment_given: "" });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleImageUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedImages([...uploadedImages, { url: file_url, caption: "" }]);
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };



  const handleSubmit = async () => {
     if (!clinical.chief_complaint) {
       return;
     }
     setSubmitting(true);

     const bp = vitals.bp_sys && vitals.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : "";
     const eventData = {
       patient_id: selectedPatient.id,
       patient_name: selectedPatient.full_name,
       site_id: user?.current_site || "",
       site_name: user?.current_site_name || "",
       paramedic_name: user?.full_name || "",
       event_date: new Date().toISOString(),
       chief_complaint: clinical.chief_complaint,
       vitals_bp: bp,
       vitals_hr: Number(vitals.hr) || 0,
       vitals_spo2: Number(vitals.spo2) || 0,
       vitals_temp: vitals.temp ? Number(vitals.temp) : undefined,
       vitals_glucose: vitals.glucose ? Number(vitals.glucose) : undefined,
       treatment_given: [
         clinical.background ? `רקע: ${clinical.background}` : "",
         clinical.hpi ? `מחלה נוכחית: ${clinical.hpi}` : "",
         clinical.physical_exam ? `בדיקה גופנית: ${clinical.physical_exam}` : "",
         clinical.treatment_given ? `טיפול: ${clinical.treatment_given}` : "",
       ].filter(Boolean).join("\n"),
       status: "open",
     };

     const event = await base44.entities.MedicalEvent.create(eventData);

     // Save images
     for (const image of uploadedImages) {
       await base44.entities.EventImage.create({
         event_id: event.id,
         image_url: image.url,
         caption: image.caption || ""
       });
     }

     // Show success screen immediately (Optimistic UI)
     setSubmitting(false);
     setCreatedEvent(event);
     setSuccess(true);

     // Refresh all relevant queries
     queryClient.invalidateQueries({ queryKey: ["site-events"] });
     queryClient.invalidateQueries({ queryKey: ["doctor-events"] });
     queryClient.invalidateQueries({ queryKey: ["all-events"] });

     // Send notification emails via backend function
     base44.functions.invoke('notifyDoctorsOnNewEvent', {
       patient_name: selectedPatient.full_name,
       patient_id_number: selectedPatient.id_number,
       chief_complaint: clinical.chief_complaint,
       hpi: clinical.hpi,
       bp,
       hr: vitals.hr,
       spo2: vitals.spo2,
       temp: vitals.temp,
       glucose: vitals.glucose,
       physical_exam: clinical.physical_exam,
       treatment_given: clinical.treatment_given,
       site_name: user?.current_site_name,
       paramedic_name: user?.full_name,
       event_id: event.id,
     }).catch(err => console.error("Failed to notify doctors:", err));
   };

  const reset = () => {
    setSelectedPatient(null);
    setPatientSubStep("search");
    setCurrentStep(0);
    setVitals({ hr: "", bp_sys: "", bp_dia: "", spo2: "", temp: "", glucose: "" });
    setClinical({ chief_complaint: "", background: "", hpi: "", physical_exam: "", treatment_given: "" });
    setUploadedImages([]);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#f1f5f9] gap-6 px-6" dir="rtl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <svg width="90" height="90" viewBox="0 0 120 120">
            <rect width="120" height="120" rx="24" fill="#1e2a38"/>
            <text x="60" y="78" textAnchor="middle" dominantBaseline="auto"
              fontFamily="Arial Black, Impact, sans-serif"
              fontWeight="900" fontSize="62">
              <tspan fill="#ffffff">F</tspan><tspan fill="#dc2626">A</tspan>
            </text>
            <rect x="16" y="90" width="88" height="5" rx="2.5" fill="#dc2626"/>
          </svg>
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">הדוח נשלח בהצלחה</h2>
          <p className="text-muted-foreground text-base">הרופאים קיבלו התראה ויגיבו בהקדם</p>
          {createdEvent?.id && (
            <div style={{ background: "rgba(30,42,56,0.08)", borderRadius: 8, padding: "6px 16px", display: "inline-block", marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: "#1e2a38", fontSize: 14 }}>#{createdEvent.id.slice(0, 4)}</span>
            </div>
          )}
        </div>
        <Button onClick={reset} className="w-full h-16 text-xl font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          פתח אירוע חדש
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f5f9]" dir="rtl">
      {/* Header */}
      <div className="bg-[#1e2a38] text-white px-4 pt-10 pb-5">
        <h1 className="text-xl font-bold">פתיחת אירוע חדש</h1>
        {user?.current_site_name && (
          <p className="text-white/70 text-sm mt-0.5">{user.current_site_name}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-[#1e2a38] px-4 pb-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= currentStep ? "bg-white" : "bg-white/30"}`} />
              <p className={`text-xs mt-1 text-center ${i <= currentStep ? "text-white font-semibold" : "text-white/50"}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full space-y-4">
        {!user?.current_site && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-4 text-base">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>יש לבחור אתר בהגדרות לפני פתיחת אירוע</span>
          </div>
        )}

        {/* Step 0 — Patient */}
        {currentStep === 0 && (
          <motion.div key="step-0" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <>
            {selectedPatient ? (
              <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-5">
                <p className="text-xl font-bold">{selectedPatient.full_name}</p>
                <p className="text-muted-foreground text-base mt-1">ת״ז: {selectedPatient.id_number}</p>
                <button
                  className="mt-3 text-primary text-base underline"
                  onClick={() => { setSelectedPatient(null); setPatientSubStep("search"); }}
                >
                  החלף מטופל
                </button>
              </div>
            ) : patientSubStep === "search" ? (
              <PatientSearch
                onSelect={(p) => { setSelectedPatient(p); setCurrentStep(1); }}
                onCreateNew={() => setPatientSubStep("create")}
              />
            ) : (
              <NewPatientForm
                onCreated={(p) => { setSelectedPatient(p); setPatientSubStep("search"); }}
                onBack={() => setPatientSubStep("search")}
                quickMode
              />
            )}
          </>
          </motion.div>
        )}

        {/* Step 1 — Vitals */}
        {currentStep === 1 && (
          <motion.div key="step-1" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <div className="space-y-5">
            <VitalField label="דופק" unit="bpm" value={vitals.hr} onChange={(v) => setVitals({ ...vitals, hr: v })} placeholder="75" />
            <div>
              <p className="text-lg font-semibold mb-2">לחץ דם (mmHg)</p>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">סיסטולי</p>
                  <input
                    type="number" inputMode="numeric" pattern="[0-9]*"
                    value={vitals.bp_sys}
                    onChange={(e) => setVitals({ ...vitals, bp_sys: e.target.value })}
                    placeholder="120"
                    className="w-full h-16 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
                  />
                </div>
                <span className="text-3xl font-bold text-muted-foreground mt-4">/</span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">דיאסטולי</p>
                  <input
                    type="number" inputMode="numeric" pattern="[0-9]*"
                    value={vitals.bp_dia}
                    onChange={(e) => setVitals({ ...vitals, bp_dia: e.target.value })}
                    placeholder="80"
                    className="w-full h-16 text-2xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
                  />
                </div>
              </div>
            </div>
            <VitalField label="סטורציה" unit="%" value={vitals.spo2} onChange={(v) => setVitals({ ...vitals, spo2: v })} placeholder="98" />
            <VitalField label="חום גוף" unit="°C" value={vitals.temp} onChange={(v) => setVitals({ ...vitals, temp: v })} placeholder="37.0" decimal />
            <VitalField label="סוכר" unit="mg/dL" value={vitals.glucose} onChange={(v) => setVitals({ ...vitals, glucose: v })} placeholder="100" />
          </div>
          </motion.div>
        )}

        {/* Step 2 — Clinical */}
         {currentStep === 2 && (
           <motion.div key="step-2" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
           <div className="space-y-5">
             <ClinicalField
               label="תלונה עיקרית *"
               value={clinical.chief_complaint}
               onChange={(v) => setClinical({ ...clinical, chief_complaint: v })}
               placeholder="למשל: הקאות ושלשולים מזה יומיים"
               rows={3}
             />
             <ClinicalField
               label="רקע רפואי"
               value={clinical.background}
               onChange={(v) => setClinical({ ...clinical, background: v })}
               placeholder="מחלות, תרופות קבועות, רגישויות"
               rows={3}
             />
             <ClinicalField
               label="מחלה נוכחית"
               value={clinical.hpi}
               onChange={(v) => setClinical({ ...clinical, hpi: v })}
               placeholder="תאר את מהלך המחלה, מתי החל, פרטים רלוונטיים, שלילת דברים דחופים"
               rows={5}
             />
             <ClinicalField
               label="בדיקה גופנית"
               value={clinical.physical_exam}
               onChange={(v) => setClinical({ ...clinical, physical_exam: v })}
               placeholder="ממצאי בדיקה גופנית רלוונטיים"
               rows={3}
             />
             <ClinicalField
               label="טיפול שניתן"
               value={clinical.treatment_given}
               onChange={(v) => setClinical({ ...clinical, treatment_given: v })}
               placeholder="אופציונלי — תרופות, עירוי, חבישה..."
               rows={2}
             />

             {/* Images Section */}
             <div>
               <p className="text-lg font-semibold mb-3">תמונות</p>

               <div className="flex gap-2 mb-4">
                 <Button
                     type="button"
                     className="flex-1 h-14 gap-2 text-base bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                     onClick={() => cameraInputRef.current?.click()}
                   >
                     <Camera className="w-5 h-5" />
                     צלם
                   </Button>
                   <Button
                     type="button"
                     className="flex-1 h-14 gap-2 text-base bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                     onClick={() => fileInputRef.current?.click()}
                   >
                     <Camera className="w-5 h-5" />
                     העלה מגלריה
                   </Button>
               </div>

               <input
                 ref={cameraInputRef}
                 type="file"
                 accept="image/*"
                 capture="environment"
                 style={{ display: "none" }}
                 onChange={(e) => handleImageUpload(e.target.files?.[0])}
               />
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="image/*"
                 style={{ display: "none" }}
                 onChange={(e) => handleImageUpload(e.target.files?.[0])}
               />

               {uploadedImages.length > 0 && (
                 <div className="grid grid-cols-3 gap-2">
                   {uploadedImages.map((img, idx) => (
                     <div key={idx} className="relative group">
                       <img src={img.url} alt={`תמונה ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                       <button
                         type="button"
                         onClick={() => handleRemoveImage(idx)}
                         className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             </div>
             </motion.div>
             )}
             </div>

             {/* Bottom Button */}
             <div className="px-4 pb-4 max-w-2xl mx-auto w-full" style={{ marginBottom: "100px" }}>
             <div className="flex gap-3">
             {currentStep > 0 && (
             <Button
             variant="outline"
             className="h-16 text-lg px-5"
             onClick={() => setCurrentStep(currentStep - 1)}
             >
             <ChevronRight className="w-5 h-5" />
             </Button>
             )}
             {currentStep < 2 ? (
             <Button
             className="flex-1 h-16 text-xl font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white"
             disabled={currentStep === 0 && !selectedPatient}
             onClick={() => setCurrentStep(currentStep + 1)}
             >
             הבא
             </Button>
             ) : (
             <Button
             className="flex-1 h-16 text-xl font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white relative overflow-hidden"
             disabled={submitting || !user?.current_site || !clinical.chief_complaint}
             onClick={handleSubmit}
             >
             {submitting && (
             <motion.div
               initial={{ width: "0%" }}
               animate={{ width: "100%" }}
               transition={{ duration: 1.8, ease: "linear" }}
               style={{
                 position: "absolute", inset: 0,
                 background: "rgba(255,255,255,0.22)",
                 pointerEvents: "none"
               }}
             />
             )}
             {submitting ? "שולח..." : "שלח דוח"}
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
      <input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        pattern={decimal ? "[0-9.]*" : "[0-9]*"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-16 text-3xl font-bold text-center border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
      />
    </div>
  );
}

function ClinicalField({ label, value, onChange, placeholder, rows }) {
  return (
    <div>
      <p className="text-lg font-semibold mb-2">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-4 text-lg border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card resize-none"
      />
    </div>
  );
}