import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, UserPlus, User } from "lucide-react";
import { format } from "date-fns";

export default function PatientSearch({ onSelect, onCreateNew }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [lastEvents, setLastEvents] = useState({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const allPatients = await base44.entities.Patient.list();
      const q = query.trim().toLowerCase();
      const filtered = allPatients.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.id_number?.includes(q)
      );
      setResults(filtered);

      // Fetch last event date for each result
      if (filtered.length > 0) {
        const events = await base44.entities.MedicalEvent.list("-event_date");
        const map = {};
        for (const p of filtered) {
          const last = events.find((e) => e.patient_id === p.id);
          if (last) map[p.id] = last.event_date;
        }
        setLastEvents(map);
      }

      setSearched(true);
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
        <input
          type="text"
          placeholder="חיפוש לפי שם או ת״ז..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full h-16 pr-12 pl-4 text-xl border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-card"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-6 text-muted-foreground text-lg">מחפש...</div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((patient) => (
            <button
              key={patient.id}
              onClick={() => onSelect(patient)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-right active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl truncate">{patient.full_name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground text-base">
                  {patient.id_number && <span>ת״ז: {patient.id_number}</span>}
                  {lastEvents[patient.id] && (
                    <span>• אירוע אחרון: {format(new Date(lastEvents[patient.id]), "dd/MM/yy")}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <div className="text-center py-6 space-y-4">
          <p className="text-muted-foreground text-lg">לא נמצאו תוצאות עבור "{query}"</p>
          <button
            onClick={onCreateNew}
            className="w-full h-16 flex items-center justify-center gap-3 text-xl font-bold border-2 border-primary text-primary rounded-2xl hover:bg-primary/5 transition-all"
          >
            <UserPlus className="w-6 h-6" />
            צור מטופל חדש
          </button>
        </div>
      )}

      {/* Initial state */}
      {!searched && !query && (
        <button
          onClick={onCreateNew}
          className="w-full h-16 flex items-center justify-center gap-3 text-xl font-semibold border-2 border-dashed border-border text-muted-foreground rounded-2xl hover:border-primary hover:text-primary transition-all"
        >
          <UserPlus className="w-6 h-6" />
          מטופל חדש
        </button>
      )}
    </div>
  );
}