import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Trash2, Plus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";

const categoryLabels = {
  equipment: "ציוד בסיסי",
  medication: "תרופות",
  consumable: "צינורות וטיפולים",
  other: "אחר",
};

export default function InventoryAdmin() {
  const [siteFilter, setSiteFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newItemModal, setNewItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", category: "equipment", quantity: 1, unit: "יח'", min_threshold: 1 });
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["inventory-all"],
    queryFn: () => base44.entities.Inventory.list("-created_date"),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.filter({ active: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const createItemMutation = useMutation({
    mutationFn: (itemData) => base44.entities.Inventory.create(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-all"] });
      setNewItemModal(false);
      setNewItem({ item_name: "", category: "equipment", quantity: 1, unit: "יח'", min_threshold: 1 });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => base44.entities.Inventory.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-all"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }) => base44.entities.Inventory.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-all"] });
    },
  });

  const getItemAlerts = (item) => {
    const alerts = [];
    if (item.min_threshold && item.quantity < item.min_threshold) alerts.push("low_stock");
    if (item.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(item.expiry_date), new Date());
      if (daysUntilExpiry <= 0) alerts.push("expired");
      else if (daysUntilExpiry <= 30) alerts.push("expiring_soon");
    }
    return alerts;
  };

  let filteredItems = items;
  if (siteFilter !== "all") {
    filteredItems = filteredItems.filter((i) => i.site_id === siteFilter);
  }
  if (categoryFilter !== "all") {
    filteredItems = filteredItems.filter((i) => i.category === categoryFilter);
  }

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoryOrder = ["equipment", "medication", "consumable", "other"];
  const sortedCategories = categoryOrder.filter((cat) => groupedItems[cat]);

  return (
    <div>
      <PageHeader title="ניהול ציוד - מנהל" />
      <div className="px-4 -mt-3 max-w-4xl mx-auto space-y-4 pb-8">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל האתרים</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setNewItemModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            הוסף פריט
          </Button>
        </div>

        {/* Add Item Modal */}
        {newItemModal && (
          <Card className="border-primary">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="שם הפריט"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                />
                <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="כמות"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                />
                <Input
                  placeholder="יחידה"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="מינימום"
                  value={newItem.min_threshold}
                  onChange={(e) => setNewItem({ ...newItem, min_threshold: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    createItemMutation.mutate({
                      ...newItem,
                      site_id: siteFilter === "all" ? "" : siteFilter,
                    })
                  }
                  disabled={!newItem.item_name || createItemMutation.isPending}
                  className="flex-1"
                >
                  {createItemMutation.isPending ? "יוצר..." : "הוסף"}
                </Button>
                <Button variant="outline" onClick={() => setNewItemModal(false)} className="flex-1">
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        {loadingItems && Array(3).fill(0).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}

        {!loadingItems && filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>אין פריטים</p>
            </CardContent>
          </Card>
        )}

        {sortedCategories.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="font-bold text-sm px-4 pt-2">{categoryLabels[category]}</h3>
            {groupedItems[category].map((item) => {
              const site = sites.find((s) => s.id === item.site_id);
              const alerts = getItemAlerts(item);
              const isLowStock = alerts.includes("low_stock");
              const isExpiringSoon = alerts.includes("expiring_soon");
              const isExpired = alerts.includes("expired");

              return (
                <Card
                  key={item.id}
                  className={`transition-all ${
                    isLowStock ? "border-destructive/50 bg-red-50" :
                    isExpiringSoon ? "border-yellow-400/50 bg-yellow-50" :
                    isExpired ? "border-destructive bg-red-50" : ""
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{item.item_name}</p>
                          {site && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              {site.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>כמות: <strong className={isLowStock ? "text-destructive" : ""}>{item.quantity}</strong> {item.unit}</span>
                          <span>| מינימום: {item.min_threshold}</span>
                          {item.expiry_date && (
                            <span className={isExpired ? "text-destructive font-semibold" : isExpiringSoon ? "text-yellow-600" : ""}>
                              | {format(new Date(item.expiry_date), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => {
                          if (confirm(`מחק ${item.item_name}?`)) {
                            deleteItemMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}