import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Stethoscope, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SelectRole({ adminMode = false }) {
  const { setUser, user, setViewAsRole } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (role) => {
    setSaving(true);
    try {
      if (adminMode) {
        // מנהל — שינוי זמני בלבד
        setViewAsRole(role);
        navigate(role === "paramedic" ? "/new-event" : "/dashboard");
      } else {
        await base44.auth.updateMe({ custom_role: role });
        setUser({ ...user, custom_role: role });
        navigate(role === "paramedic" ? "/new-event" : "/dashboard");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-8 px-6 w-full max-w-sm">
        <div>
          <h1 className="text-2xl font-bold">
            {adminMode ? "צפייה כתפקיד" : "ברוך הבא"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {adminMode ? "בחר תפקיד לצפייה זמנית" : "בחר את התפקיד שלך במערכת"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect("paramedic")}
            disabled={saving}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <HeartPulse className="w-12 h-12 text-primary" />
            <span className="font-bold text-lg">פראמדיק</span>
          </button>

          <button
            onClick={() => handleSelect("doctor")}
            disabled={saving}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <Stethoscope className="w-12 h-12 text-primary" />
            <span className="font-bold text-lg">רופא</span>
          </button>
        </div>
      </div>
    </div>
  );
}