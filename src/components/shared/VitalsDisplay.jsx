import React from "react";
import { Heart, Activity, Droplets, Thermometer, Candy } from "lucide-react";

const vitalsConfig = [
  { key: "vitals_bp",      label: "ל״ד",    icon: Activity,    unit: "",       border: "border-r-4 border-r-red-800" },
  { key: "vitals_hr",      label: "דופק",   icon: Heart,       unit: "bpm",    border: "border-r-4 border-r-red-500" },
  { key: "vitals_spo2",    label: "SpO2",   icon: Droplets,    unit: "%",      border: "border-r-4 border-r-blue-500" },
  { key: "vitals_temp",    label: "חום",    icon: Thermometer, unit: "°C",     border: "border-r-4 border-r-yellow-400" },
  { key: "vitals_glucose", label: "סוכר",  icon: Candy,       unit: "mg/dL",  border: "border-r-4 border-r-purple-400" },
];

export default function VitalsDisplay({ event }) {
  const renderCard = ({ key, label, icon: Icon, unit, border }, extraStyle = {}) => {
    const value = event[key];
    const hasValue = value !== undefined && value !== null && value !== "" && value !== 0;
    return (
      <div key={key} style={extraStyle} className={`bg-muted/50 rounded-xl p-2 text-center flex-shrink-0 ${border}`}>
        <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-xs font-bold mt-0.5">
          {hasValue ? `${value}${unit}` : <span className="text-muted-foreground font-normal">-</span>}
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Desktop: grid 5 columns */}
      <div className="hidden sm:grid grid-cols-5 gap-1.5">
        {vitalsConfig.map(v => renderCard(v))}
      </div>

      {/* Mobile: horizontal scroll, show 3 at a time */}
      <div
        className="flex sm:hidden gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {vitalsConfig.map(v => renderCard(v, { minWidth: "calc((100% - 2 * 6px) / 3)", width: "calc((100% - 2 * 6px) / 3)" }))}
      </div>
    </>
  );
}