import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Camera, Image as ImageIcon } from "lucide-react";

export default function AddImageForm({ patientId, authorName, onSaved, onCancel, onSaveError }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState("");
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
    if (!imageFile) return;
    // Optimistic: הצג הצלחה וסגור מיידית
    showToast("התמונה הועלתה ✓");
    setTimeout(() => onSaved(), 800);

    // העלאה ושמירה ברקע
    const doSave = async () => {
      const res = await base44.integrations.Core.UploadFile({ file: imageFile });
      const image = await base44.entities.PatientImage.create({
        patient_id: patientId,
        author_name: authorName || "",
        image_url: res.file_url,
        caption,
      });
      base44.functions.invoke('notifyDoctorsOnImage', {
        patient_id: patientId,
        image_id: image.id,
        author_name: authorName,
        caption,
      }).catch(() => {});
    };
    doSave().catch(() => {
      onSaveError?.("שגיאה בשמירה, נסה שוב");
    });
  };

  // If no image selected yet — show pickers immediately
  if (!imagePreview) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
        <div className="bg-primary text-primary-foreground px-4 pt-10 pb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">הוסף תמונה</h1>
          <button onClick={onCancel}><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full space-y-4">
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <ImageIcon className="w-10 h-10" />
              <span className="text-lg font-medium">בחר מהגלריה</span>
            </button>
            <button onClick={() => cameraInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Camera className="w-10 h-10" />
              <span className="text-lg font-medium">צלם עם המצלמה</span>
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">הוסף תמונה</h1>
        <button onClick={onCancel}><X className="w-6 h-6" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-4">
        <div className="relative">
          <img src={imagePreview} alt="preview" className="w-full rounded-xl object-cover max-h-64" />
          <button className="absolute top-2 left-2 bg-black/60 rounded-full p-1" onClick={() => { setImageFile(null); setImagePreview(null); }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <p className="text-base font-semibold mb-1">כיתוב (אופציונלי)</p>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="תיאור קצר..." rows={2}
            className="w-full p-3 text-base border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card resize-none" />
        </div>
      </div>
      <div className="px-4 pt-3 max-w-2xl mx-auto w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>
        <Button className="w-full h-16 text-xl font-bold relative overflow-hidden" onClick={handleSave} disabled={saving || !imageFile}>
          {saving && (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.22)", pointerEvents: "none" }}
            />
          )}
          {saving ? "מעלה..." : "שמור תמונה"}
        </Button>
      </div>
    </div>
  );
}