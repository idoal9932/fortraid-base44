import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const resultLabels = {
  all_present: "הכל קיים",
  missing_updated: "חוסרים כמעודכן בטבלה",
  missing_critical: "חוסרים חריגים - אפנה טלפונית",
};

const resultColors = {
  all_present: "text-green-600 bg-green-50 border-green-200",
  missing_updated: "text-yellow-700 bg-yellow-50 border-yellow-200",
  missing_critical: "text-red-600 bg-red-50 border-red-200",
};

export default function CheckupHistoryDialog({ siteName, checkups, onClose }) {
  const sorted = [...checkups].sort((a, b) => new Date(b.check_date) - new Date(a.check_date));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-center">היסטוריית בדיקות שבועיות</h2>
        <p className="text-xs text-muted-foreground text-center">{siteName}</p>

        <div className="overflow-y-auto flex-1 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין בדיקות רשומות לאתר זה</p>
          ) : (
            sorted.map(c => (
              <Card key={c.id} className="border">
                <CardContent className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.paramedic_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(c.check_date), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <span className={`text-xs border px-2 py-1 rounded-full font-medium ${resultColors[c.result]}`}>
                    {resultLabels[c.result]}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>סגור</Button>
      </div>
    </div>
  );
}