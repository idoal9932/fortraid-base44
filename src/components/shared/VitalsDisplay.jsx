import React from "react";
import { Heart, Activity, Droplets, Brain } from "lucide-react";

const vitalsConfig = [
  { key: "vitals_bp", label: "ל״ד", icon: Activity, unit: "" },
  { key: "vitals_hr", label: "דופק", icon: Heart, unit: "bpm" },
  { key: "vitals_spo2", label: "SpO2", icon: Droplets, unit: "%" },
  { key: "vitals_gcs", label: "GCS", icon: Brain, unit: "" },
];

export default function VitalsDisplay({ event }) {
  const activeVitals = vitalsConfig.filter(({ key }) => event[key] !== undefined && event[key] !== null && event[key] !== "");
  if (activeVitals.length === 0) return null;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${activeVitals.length}, minmax(0, 1fr))` }}>
      {activeVitals.map(({ key, label, icon: Icon, unit }) => (
        <div key={key} className={`bg-muted/50 rounded-xl p-2.5 text-center ${label === "דופק" ? "border-r-4 border-r-red-600" : ""}`}>
          <Icon className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">
            {event[key]}{unit}
          </p>
        </div>
      ))}
    </div>
  );
}