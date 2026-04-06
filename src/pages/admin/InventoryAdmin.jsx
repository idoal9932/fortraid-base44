import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Trash2, Plus, Check, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";

const categoryLabels = {
  rashm_tzfp_car: "רשמ״צ רכב",
  monitoring: "מכשור רפואי",
  medications: "תרופות",
  medications_routine: "תרופות שגרה",
  medical_kit: "תיק מטפל",
  charged: "נטענים",
};

const emptyNewItem = () => ({ item_name: "", category: "", quantity: "", unit: "יח'", min_threshold: "", expiry_date: "", notes: "", site_id: "" });

export default function InventoryAdmin() {
  const [siteFilter, setSiteFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addingRow, setAddingRow] = useState(false);
  const [newItem, setNewItem] = useState(emptyNewItem());
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
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setAddingRow(false);
      setNewItem(emptyNewItem());
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => base44.entities.Inventory.delete(itemId),
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

          <Button onClick={() => { setAddingRow(true); setNewItem(emptyNewItem()); }} className="gap-2" disabled={addingRow}>
            <Plus className="w-4 h-4" />
            הוסף פריט
          </Button>
        </div>

        {/* Items Table */}
        {loadingItems ? (
          <Card><CardContent className="p-4"><Skeleton className="h-32" /></CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b">
                <tr>
                  <th className="px-3 py-2 text-right font-semibold">שם פריט *</th>
                  <th className="px-3 py-2 text-right font-semibold">קטגוריה *</th>
                  <th className="px-3 py-2 text-right font-semibold">אתר</th>
                  <th className="px-3 py-2 text-center font-semibold">כמות</th>
                  <th className="px-3 py-2 text-center font-semibold">מינימום</th>
                  <th className="px-3 py-2 text-right font-semibold">תפוגה</th>
                  <th className="px-3 py-2 text-right font-semibold">הערות</th>
                  <th className="px-3 py-2 text-center font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {/* New item row */}
                {addingRow && (
                  <tr className="border-b bg-primary/5">
                    <td className="px-2 py-1.5">
                      <Input
                        autoFocus
                        placeholder="שם הפריט"
                        value={newItem.item_name}
                        onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={newItem.site_id} onValueChange={(v) => setNewItem({ ...newItem, site_id: v })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="אתר" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number" min="0"
                        placeholder="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="h-8 w-16 text-center text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number" min="0"
                        placeholder="0"
                        value={newItem.min_threshold}
                        onChange={(e) => setNewItem({ ...newItem, min_threshold: e.target.value })}
                        className="h-8 w-16 text-center text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        value={newItem.expiry_date}
                        onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        placeholder="הערות"
                        value={newItem.notes}
                        onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon" variant="default"
                          className="h-7 w-7 bg-green-600 hover:bg-green-700"
                          disabled={!newItem.item_name || !newItem.category || createItemMutation.isPending}
                          onClick={() => createItemMutation.mutate({
                            ...newItem,
                            quantity: parseFloat(newItem.quantity) || 0,
                            min_threshold: parseFloat(newItem.min_threshold) || 0,
                            expiry_date: newItem.expiry_date || undefined,
                            notes: newItem.notes || undefined,
                            site_id: newItem.site_id || undefined,
                          })}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { setAddingRow(false); setNewItem(emptyNewItem()); }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Existing items */}
                {filteredItems.length === 0 && !addingRow ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>אין פריטים</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const site = sites.find((s) => s.id === item.site_id);
                    const alerts = getItemAlerts(item);
                    const isLowStock = alerts.includes("low_stock");
                    const isExpiringSoon = alerts.includes("expiring_soon");
                    const isExpired = alerts.includes("expired");
                    const rowCls = isExpired ? "bg-red-50 border-red-300" : isLowStock ? "bg-red-50" : isExpiringSoon ? "bg-yellow-50" : "";

                    return (
                      <tr key={item.id} className={`border-b transition-colors hover:bg-accent/30 ${rowCls}`}>
                        <td className="px-3 py-2 font-medium">{item.item_name}</td>
                        <td className="px-3 py-2 text-xs">{categoryLabels[item.category] || item.category}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{site?.name || "—"}</td>
                        <td className={`px-3 py-2 text-center font-semibold ${isLowStock ? "text-destructive" : ""}`}>{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">{item.min_threshold || "—"}</td>
                        <td className={`px-3 py-2 text-xs ${isExpired ? "text-destructive font-semibold" : isExpiringSoon ? "text-yellow-600" : ""}`}>
                          {item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{item.notes || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`מחק ${item.item_name}?`)) deleteItemMutation.mutate(item.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}