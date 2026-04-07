import React from "react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  open: { label: "פתוח", className: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/10" },
  followup: { label: "מעקב", className: "border-teal-500/40 text-teal-400 bg-teal-500/10 hover:bg-teal-500/10" },
  closed: { label: "סגור", className: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/10" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.open;
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}
