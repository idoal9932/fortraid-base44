import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import InventoryTable from "@/components/inventory/InventoryTable";
import WeeklyCheckupDialog from "@/components/inventory/WeeklyCheckupDialog";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function DoctorInventory() {
  const { user } = useAuth();
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCheckupDialog, setShowCheckupDialog] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.filter({ active: true }),
    staleTime: 60 * 1000,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list("-created_date"),
    staleTime: 30 * 1000,
  });

  const { data: checkups = [] } = useQuery({
    queryKey: ["weekly-checkups", selectedSiteId],
    queryFn: () => base44.entities.WeeklyCheckup.filter({ site_id: selectedSiteId }, "-check_date", 20),
    enabled: !!selectedSiteId,
    staleTime: 30 * 1000,
  });

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const siteItems = selectedSiteId ? items.filter(i => i.site_id === selectedSiteId) : items;

  const lastCheckup = checkups[0];
  const isStale = !lastCheckup || (new Date() - new Date(lastCheckup.check_date)) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div>
      <PageHeader title="ניהול ציוד" subtitle="תצוגת רופא" />
      <div className="px-4 -mt-3 max-w-6xl mx-auto space-y-4 pb-8">

        {/* Site Selector */}
        <div className="mt-6">
          <select
            value={selectedSiteId}
            onChange={e => { setSelectedSiteId(e.target.value); setSelectedCategory("all"); }}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">כל האתרים</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory Table */}
        {siteItems.length > 0 ? (
          <>
            <InventoryTable
              items={siteItems}
              isLoading={isLoading}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Weekly Checkup Button */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className={`gap-2 flex-1 ${isStale ? "border-red-400 text-red-600 hover:bg-red-50" : ""}`}
                onClick={() => setShowCheckupDialog(true)}
              >
                <Calendar className="w-4 h-4" />
                בדיקה שבועית
              </Button>
            </div>

            {/* Checkup History */}
            {selectedSiteId && checkups.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground">היסטוריית בדיקות</h3>
                {checkups.map(c => (
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
                ))}
              </div>
            )}
          </>
        ) : (
          !isLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>אין פריטים לתצוגה</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {showCheckupDialog && (
        <WeeklyCheckupDialog
          siteId={selectedSiteId || "general"}
          siteName={selectedSite?.name || "כללי"}
          onClose={() => setShowCheckupDialog(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}