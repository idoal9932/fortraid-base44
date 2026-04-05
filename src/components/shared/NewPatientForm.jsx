import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Save } from "lucide-react";

export default function NewPatientForm({ onCreated, onBack, quickMode = false }) {
  const [form, setForm] = useState({
    full_name: "",
    id_number: "",
    date_of_birth: "",
    age: "",
    gender: "",
    blood_type: "",
    allergies: "",
    chronic_conditions: "",
    nationality: "ישראלי",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.full_name) return;
    setSaving(true);
    const patientData = {
      ...form,
      age: form.age ? Number(form.age) : undefined,
    };
    const patient = await base44.entities.Patient.create(patientData);
    onCreated(patient);
    setSaving(false);
  };

  if (quickMode) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground text-base">
          <ArrowRight className="w-5 h-5" />
          חזרה לחיפוש
        </button>
        <div>
          <p className="text-lg font-semibold mb-2">שם מלא *</p>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="שם פרטי ושם משפחה"
            className="w-full h-16 px-4 text-xl border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
          />
        </div>
        <div>
           <p className="text-lg font-semibold mb-2">תעודת זהות</p>
           <input
             type="number" inputMode="numeric" pattern="[0-9]*"
             value={form.id_number}
             onChange={(e) => setForm({ ...form, id_number: e.target.value })}
             placeholder="000000000"
             className="w-full h-16 px-4 text-xl border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
           />
         </div>
         <div>
           <p className="text-lg font-semibold mb-2">גיל</p>
           <input
             type="number" inputMode="numeric" pattern="[0-9]*"
             value={form.age}
             onChange={(e) => setForm({ ...form, age: e.target.value })}
             placeholder="25"
             className="w-full h-16 px-4 text-xl border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
           />
         </div>
         <div>
           <p className="text-lg font-semibold mb-2">מין</p>
           <div className="grid grid-cols-3 gap-2">
             {["male", "female", "other"].map((val) => (
               <button
                 key={val}
                 onClick={() => setForm({ ...form, gender: val })}
                 className={`h-14 rounded-xl font-semibold transition-all ${
                   form.gender === val
                     ? "bg-primary text-primary-foreground"
                     : "bg-card border-2 border-border"
                 }`}
               >
                 {val === "male" ? "זכר" : val === "female" ? "נקבה" : "אחר"}
               </button>
             ))}
           </div>
         </div>
         <Button
          onClick={handleSave}
          disabled={saving || !form.full_name}
          className="w-full h-16 text-xl font-bold"
        >
          {saving ? "שומר..." : "המשך"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
        <ArrowRight className="w-4 h-4" />
        חזרה לחיפוש
      </Button>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>שם מלא *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <Label>תעודת זהות</Label>
          <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
        </div>
        <div>
          <Label>תאריך לידה</Label>
          <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </div>
        <div>
          <Label>גיל</Label>
          <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="25" />
        </div>
        <div>
          <Label>מין</Label>
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">זכר</SelectItem>
              <SelectItem value="female">נקבה</SelectItem>
              <SelectItem value="other">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>סוג דם</Label>
          <Select value={form.blood_type} onValueChange={(v) => setForm({ ...form, blood_type: v })}>
            <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>אלרגיות</Label>
          <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        </div>
        <div>
          <Label>מחלות רקע</Label>
          <Input value={form.chronic_conditions} onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || !form.full_name} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? "שומר..." : "שמור מטופל"}
      </Button>
    </div>
  );
}