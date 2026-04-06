import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const resultOptions = [
  { value: "all_present", label: "הכל קיים" },
  { value: "missing_updated", label: "חוסרים כמעודכן בטבלה" },
  { value: "missing_critical", label: "חוסרים חריגים - אפנה טלפונית" },
];

export default function WeeklyCheckupDialog({ siteId, siteName, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedParamedic, setSelectedParamedic] = useState("");
  const [result, setResult] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users-paramedics"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60 * 1000,
  });

  const paramedics = users.filter(u => u.custom_role === "paramedic");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WeeklyCheckup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-checkups"] });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!selectedParamedic || !result) return;
    createMutation.mutate({
      site_id: siteId,
      site_name: siteName,
      paramedic_name: selectedParamedic,
      check_date: new Date().toISOString(),
      result,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-center">בדיקה שבועית</h2>
        <p className="text-xs text-muted-foreground text-center">{siteName} — {format(new Date(), "dd/MM/yyyy")}</p>

        {/* Paramedic Select */}
        <div className="space-y-1">
          <label className="text-sm font-medium">פרמדיק</label>
          <select
            value={selectedParamedic}
            onChange={e => setSelectedParamedic(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">בחר פרמדיק...</option>
            {paramedics.map(p => (
              <option key={p.id} value={p.full_name}>{p.full_name}</option>
            ))}
          </select>
        </div>

        {/* Result Radio */}
        <div className="space-y-2">
          <label className="text-sm font-medium">תוצאת הבדיקה</label>
          {resultOptions.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                result === opt.value ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="result"
                value={opt.value}
                checked={result === opt.value}
                onChange={() => setResult(opt.value)}
                className="accent-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedParamedic || !result || createMutation.isPending}
          >
            {createMutation.isPending ? "שולח..." : "שלח"}
          </Button>
        </div>
      </div>
    </div>
  );
}