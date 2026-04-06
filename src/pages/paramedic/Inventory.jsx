import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { differenceInDays } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import InventoryTable from "@/components/inventory/InventoryTable";
import WeeklyCheckupDialog from "@/components/inventory/WeeklyCheckupDialog";

export default function InventoryPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCheckupDialog, setShowCheckupDialog] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list("-created_date"),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const siteId = user?.current_site;

  const { data: checkups = [] } = useQuery({
    queryKey: ["weekly-checkups", siteId],
    queryFn: () => base44.entities.WeeklyCheckup.filter({ site_id: siteId }, "-check_date", 1),
    enabled: !!siteId,
    staleTime: 30 * 1000,
  });

  const lastCheckup = checkups[0];
  const isStale = !lastCheckup || (new Date() - new Date(lastCheckup.check_date)) > 7 * 24 * 60 * 60 * 1000;

  const siteItems = siteId ? items.filter(i => i.site_id === siteId) : items;

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.filter({ active: true }),
    staleTime: 60 * 1000,
  });
  const site = sites.find(s => s.id === siteId);

  return (
    <div>
      <PageHeader title="ניהול ציוד" subtitle="כל הפריטים" />
      <div className="px-4 -mt-3 max-w-6xl mx-auto space-y-4 pb-8">
        {siteItems.length > 0 && (
          <>
            <div className="mt-10">
              <InventoryTable
                items={siteItems}
                isLoading={isLoading}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            </div>

            {/* Bottom Buttons */}
            <div className="flex gap-3 pt-4">
              <Button className="gap-2 flex-1">
                <Plus className="w-4 h-4" />
                הוסף פריט
              </Button>
              <Button
                variant="outline"
                className={`gap-2 flex-1 ${isStale ? "border-red-400 text-red-600 hover:bg-red-50" : ""}`}
                onClick={() => setShowCheckupDialog(true)}
              >
                <Calendar className="w-4 h-4" />
                בדיקה שבועית
              </Button>
            </div>
          </>
        )}
      </div>

      {showCheckupDialog && (
        <WeeklyCheckupDialog
          siteId={siteId || "general"}
          siteName={site?.name || "האתר שלי"}
          onClose={() => setShowCheckupDialog(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}