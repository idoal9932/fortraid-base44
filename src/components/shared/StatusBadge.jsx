import React from "react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  open: { label: "פתוח", className: "bg-red-100 text-red-900 border-red-200 hover:bg-red-100" },
  followup: { label: "מעקב", className: "bg-blue-500/15 text-blue-600 border-blue-200 hover:bg-blue-500/15" },
  closed: { label: "סגור", className: "bg-emerald-500/15 text-emerald-600 border-emerald-200 hover:bg-emerald-500/15" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.open;
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}