import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Minus, Trash2, Calendar, Check } from "lucide-react";
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

export default function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [checkedItems, setCheckedItems] = useState({});
  const [confirmingItem, setConfirmingItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list("-created_date"),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload) => base44.entities.Inventory.update(payload.id, payload.data),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const previous = queryClient.getQueryData(["inventory"]);
      queryClient.setQueryData(["inventory"], (old = []) =>
        old.map(item => item.id === payload.id ? { ...item, ...payload.data } : item)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["inventory"], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEditingCell(null);
    },
  });

  const handleCheckboxClick = (item) => {
    if (!item.min_threshold || item.quantity >= item.min_threshold) return;

    setCheckedItems(prev => ({ ...prev, [item.id]: true }));
    setConfirmingItem(item.id);

    updateItemMutation.mutate({
      id: item.id,
      data: { quantity: item.min_threshold, last_checked: format(new Date(), "yyyy-MM-dd HH:mm"), checked_by: user?.full_name }
    }, {
      onSuccess: () => {
        setTimeout(() => {
          setConfirmingItem(null);
          setCheckedItems(prev => ({ ...prev, [item.id]: false }));
        }, 1500);
      }
    });
  };

  const handleMarkAllValid = () => {
    const validItems = filteredItems.filter(i => !i.min_threshold || i.quantity >= i.min_threshold);
    validItems.forEach(item => {
      updateItemMutation.mutate({
        id: item.id,
        data: { last_checked: format(new Date(), "yyyy-MM-dd HH:mm"), checked_by: user?.full_name }
      });
    });
  };

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => base44.entities.Inventory.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const getRowColor = (item) => {
    if (item.expiry_date) {
      const daysUntilExpiry = differenceInDays(new Date(item.expiry_date), new Date());
      if (daysUntilExpiry < 0) return "bg-slate-700 text-white";
      if (daysUntilExpiry <= 30) return "bg-yellow-50";
    }
    if (item.min_threshold && item.quantity < item.min_threshold) return "bg-red-100";
    return "";
  };

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  const categories = ["all", ...Object.keys(categoryLabels).filter(c => items.some(i => i.category === c))];

  return (
    <div>
      <PageHeader title="ניהול ציוד" subtitle="כל הפריטים" />
      <div className="px-4 -mt-3 max-w-6xl mx-auto space-y-4 pb-8">
        {items.length > 0 && (
          <>
            {/* Filter Buttons */}
             <div className="flex gap-2 flex-wrap mb-6 mt-10">
               {categories.map(cat => (
                 <Button
                   key={cat}
                   variant={selectedCategory === cat ? "default" : "outline"}
                   size="sm"
                   onClick={() => setSelectedCategory(cat)}
                   className="text-xs h-5 px-2.5 py-0"
                 >
                   {cat === "all" ? "הכל" : categoryLabels[cat]}
                 </Button>
               ))}
             </div>

            {/* Table */}
            {isLoading ? (
              <Card><CardContent className="p-4"><Skeleton className="h-64" /></CardContent></Card>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>אין פריטים לתצוגה</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b">
                    <tr>
                      <th className="px-3 py-2 text-center font-semibold w-10">✓</th>
                      <th className="px-3 py-2 text-right font-semibold">שם פריט</th>
                      <th className="px-3 py-2 text-right font-semibold">קטגוריה</th>
                      <th className="px-3 py-2 text-center font-semibold">כמות</th>
                      <th className="px-3 py-2 text-center font-semibold">מינימום</th>
                      <th className="px-3 py-2 text-right font-semibold">תפוגה</th>
                      <th className="px-3 py-2 text-right font-semibold">הערות</th>
                      <th className="px-3 py-2 text-center font-semibold">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} className={`border-b transition-colors ${getRowColor(item)} ${confirmingItem === item.id ? "animate-pulse" : ""} hover:bg-accent/50`}>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleCheckboxClick(item)}
                            type="button"
                            className={`flex items-center justify-center w-6 h-6 rounded border transition-all ${
                              item.min_threshold && item.quantity < item.min_threshold
                                ? "cursor-pointer border-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30"
                                : "border-border opacity-40"
                            } ${checkedItems[item.id] ? "bg-green-500 border-green-500" : ""}`}
                          >
                            {checkedItems[item.id] && <Check className="w-4 h-4 text-white" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-medium">{item.item_name}</td>
                        <td className="px-3 py-2 text-xs">{categoryLabels[item.category] || item.category}</td>
                        <td className="px-3 py-2 text-center">
                          {editingCell?.id === item.id && editingCell.field === "quantity" ? (
                            <Input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  data: { quantity: parseInt(editValue) || 0 }
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateItemMutation.mutate({
                                    id: item.id,
                                    data: { quantity: parseInt(editValue) || 0 }
                                  });
                                }
                              }}
                              autoFocus
                              className="h-8 w-16 text-center"
                              inputMode="numeric"
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: item.id, field: "quantity" });
                                setEditValue(item.quantity.toString());
                              }}
                              className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block"
                            >
                              {item.quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editingCell?.id === item.id && editingCell.field === "min_threshold" ? (
                            <Input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  data: { min_threshold: parseInt(editValue) || 0 }
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateItemMutation.mutate({
                                    id: item.id,
                                    data: { min_threshold: parseInt(editValue) || 0 }
                                  });
                                }
                              }}
                              autoFocus
                              className="h-8 w-16 text-center"
                              inputMode="numeric"
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: item.id, field: "min_threshold" });
                                setEditValue((item.min_threshold || 0).toString());
                              }}
                              className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block text-xs"
                            >
                              {item.min_threshold || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {editingCell?.id === item.id && editingCell.field === "expiry_date" ? (
                            <Input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  data: { expiry_date: editValue || null }
                                });
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : item.expiry_date ? (
                            <span
                              onClick={() => {
                                setEditingCell({ id: item.id, field: "expiry_date" });
                                setEditValue(item.expiry_date);
                              }}
                              className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block"
                            >
                              {format(new Date(item.expiry_date), "dd/MM/yyyy")}
                            </span>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: item.id, field: "expiry_date" });
                                setEditValue("");
                              }}
                              className="cursor-pointer text-muted-foreground hover:bg-primary/10 px-2 py-1 rounded block"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs max-w-xs">
                          {editingCell?.id === item.id && editingCell.field === "notes" ? (
                            <Input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                updateItemMutation.mutate({
                                  id: item.id,
                                  data: { notes: editValue }
                                });
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingCell({ id: item.id, field: "notes" });
                                setEditValue(item.notes || "");
                              }}
                              className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded block text-muted-foreground"
                            >
                              {item.notes || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateItemMutation.mutate({
                                id: item.id,
                                data: { quantity: Math.max(0, item.quantity - 1) }
                              })}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateItemMutation.mutate({
                                id: item.id,
                                data: { quantity: item.quantity + 1 }
                              })}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`מחק ${item.item_name}?`)) {
                                  deleteItemMutation.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="flex gap-3 pt-4">
              <Button className="gap-2 flex-1">
                <Plus className="w-4 h-4" />
                הוסף פריט
              </Button>
              <Button variant="outline" className="gap-2 flex-1">
                <Calendar className="w-4 h-4" />
                בדיקה שבועית
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}