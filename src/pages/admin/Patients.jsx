import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

const EMPTY_ROW = { full_name: "", id_number: "", age: "", gender: "", site_id: "" };

export default function Patients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRow, setNewRow] = useState(null);
  const [rowError, setRowError] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["all-patients"],
    queryFn: () => base44.entities.Patient.list(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId) => base44.entities.Patient.delete(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-patients"] });
      toast({ title: "מחוק", description: "המטופל הוסר בהצלחה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-patients"] });
      setNewRow(null);
      setRowError("");
      toast({ title: "המטופל נוסף ✓" });
    },
    onError: (err) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveNewRow = () => {
    if (!newRow.full_name.trim() || !newRow.id_number.toString().trim()) {
      setRowError("שם מלא ות״ז הם שדות חובה");
      return;
    }
    setRowError("");
    const payload = {
      full_name: newRow.full_name.trim(),
      id_number: newRow.id_number.toString().trim(),
      ...(newRow.age ? { age: Number(newRow.age) } : {}),
      ...(newRow.gender ? { gender: newRow.gender } : {}),
      ...(newRow.site_id ? { site_id: newRow.site_id } : {}),
    };
    addPatientMutation.mutate(payload);
  };

  // Only admins can view this page
  if (user?.role !== "admin") {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            <p>אין לך הרשאה לגשת לעמוד זה</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const genderLabels = { male: "זכר", female: "נקבה", other: "אחר" };

  const calculateAge = (birthDate) => {
    if (!birthDate) return "—";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : "—";
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("he-IL");
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="רשימת מטופלים" />
        <div className="px-4 -mt-3 max-w-6xl mx-auto">
          <Card><CardContent className="p-4"><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="רשימת מטופלים" />
      <div className="px-4 -mt-3 max-w-6xl mx-auto space-y-4 pb-8">
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => { setNewRow({ ...EMPTY_ROW }); setRowError(""); }}>
            הוסף מטופל +
          </Button>
        </div>
        {patients.length === 0 && !newRow ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>אין מטופלים</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold">שם מלא</th>
                  <th className="px-4 py-2 text-right font-semibold">ת"ז</th>
                  <th className="px-4 py-2 text-right font-semibold">גיל</th>
                  <th className="px-4 py-2 text-right font-semibold">מין</th>
                  <th className="px-4 py-2 text-right font-semibold">אתר</th>
                  <th className="px-4 py-2 text-right font-semibold">תאריך יצירה</th>
                  <th className="px-4 py-2 text-center font-semibold">מחק</th>
                </tr>
              </thead>
              <tbody>
                {newRow && (
                  <>
                    <tr className="border-b bg-secondary/30">
                      <td className="px-2 py-1">
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="שם מלא *"
                          value={newRow.full_name}
                          onChange={(e) => setNewRow({ ...newRow, full_name: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="ת״ז *"
                          value={newRow.id_number}
                          onChange={(e) => setNewRow({ ...newRow, id_number: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-16 border rounded px-2 py-1 text-sm"
                          placeholder="גיל"
                          value={newRow.age}
                          onChange={(e) => setNewRow({ ...newRow, age: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={newRow.gender}
                          onChange={(e) => setNewRow({ ...newRow, gender: e.target.value })}
                        >
                          <option value="">—</option>
                          <option value="male">זכר</option>
                          <option value="female">נקבה</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={newRow.site_id}
                          onChange={(e) => setNewRow({ ...newRow, site_id: e.target.value })}
                        >
                          <option value="">—</option>
                          {sites.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{new Date().toLocaleDateString("he-IL")}</td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={handleSaveNewRow} disabled={addPatientMutation.isPending}>
                            ✓
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setNewRow(null); setRowError(""); }}>
                            ✗
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {rowError && (
                      <tr>
                        <td colSpan={7} className="px-4 py-1 text-xs text-destructive">{rowError}</td>
                      </tr>
                    )}
                  </>
                )}
                {patients.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-accent/50">
                    <td className="px-4 py-2 font-medium">{p.full_name}</td>
                    <td className="px-4 py-2">{p.id_number}</td>
                    <td className="px-4 py-2">{p.age || calculateAge(p.date_of_birth)}</td>
                    <td className="px-4 py-2 text-xs">{p.gender ? genderLabels[p.gender] : "—"}</td>
                    <td className="px-4 py-2 text-xs">{p.site_id ? (sites.find((s) => s.id === p.site_id)?.name ?? "—") : "—"}</td>
                    <td className="px-4 py-2 text-xs">{formatDate(p.created_date)}</td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletePatientMutation.isPending}
                        onClick={() => {
                          if (confirm(`מחק מטופל ${p.full_name}?`)) {
                            deletePatientMutation.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}