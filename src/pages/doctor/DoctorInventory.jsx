import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/layout/PageHeader";
import InventoryTable from "@/components/inventory/InventoryTable";
import CheckupHistoryDialog from "@/components/inventory/CheckupHistoryDialog";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DoctorInventory() {
  const { user } = useAuth();
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

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
      <div className="px-4 -mt-3 max-w-6xl mx-auto space-y-3 pb-8">

        {/* Site Selector */}
        <div className="mt-6">
          <select
            value={selectedSiteId}
            onChange={e => { setSelectedSiteId(e.target.value); setSelectedCategory("all"); }}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background text-foreground appearance-none"
            style={{ direction: "rtl" }}
          >
            <option value="">כל האתרים</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory Table + Checkup button between categories and table */}
        {siteItems.length > 0 ? (
          <InventoryTable
            items={siteItems}
            isLoading={isLoading}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            extraBetweenCategoriesAndTable={
              selectedSiteId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 w-full mb-2 ${isStale ? "border-red-400 text-red-600 hover:bg-red-50" : ""}`}
                  onClick={() => setShowHistoryDialog(true)}
                >
                  <Calendar className="w-4 h-4" />
                  בדיקה שבועית
                </Button>
              ) : null
            }
          />
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

      {showHistoryDialog && (
        <CheckupHistoryDialog
          siteName={selectedSite?.name || "האתר הנבחר"}
          checkups={checkups}
          onClose={() => setShowHistoryDialog(false)}
        />
      )}
    </div>
  );
}