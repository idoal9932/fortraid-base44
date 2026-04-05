import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";

export default function DoctorPatients() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data = {}, isLoading: loadingPatients } = useQuery({
    queryKey: ["patients-with-events"],
    queryFn: async () => {
      const [patients, events] = await Promise.all([
        base44.entities.Patient.list(),
        base44.entities.MedicalEvent.filter({}, "-event_date"),
      ]);
      console.log("Raw API response - patients count:", patients.length);
      console.log("Raw API response - events count:", events.length);
      return { patients, events };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const patients = data.patients || [];
  const events = data.events || [];

  // Debug logs
  console.log("patients:", patients);
  console.log("events:", events);
  console.log("statuses:", [...new Set(events.map(e => e.status))]);

  // Calculate patient status and age
  const patientsWithStatus = useMemo(() => {
    return patients.map(patient => {
      const patientEvents = events.filter(e => e.patient_id === patient.id);
      
      // Calculate age
      let age = null;
      if (patient.date_of_birth) {
        const birthDate = new Date(patient.date_of_birth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // Determine status based on events
      let status = "none"; // no events
      if (patientEvents.length > 0) {
        const hasOpenEvent = patientEvents.some(e => e.status === "open" || e.status === "followup");
        if (hasOpenEvent) {
          status = "red"; // active event (not closed)
        } else {
          status = "yellow"; // has timeline (closed events)
        }
      }

      return {
        ...patient,
        age,
        status,
        eventCount: patientEvents.length,
      };
      });
      }, [patients, events]);

      console.log("patientsWithStatus:", patientsWithStatus);

  // Filter by search
  const filteredPatients = useMemo(() => {
    return patientsWithStatus.filter(p =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id_number.includes(searchQuery)
    );
  }, [patientsWithStatus, searchQuery]);

  // Sort: red first, then yellow, then none
  const sortedPatients = useMemo(() => {
    const statusOrder = { red: 0, yellow: 1, none: 2 };
    return [...filteredPatients].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [filteredPatients]);

  const getStatusColor = (status) => {
    if (status === "red") return "bg-red-200 border-red-400";
    if (status === "yellow") return "bg-yellow-200 border-yellow-400";
    return "";
  };

  const getStatusDot = (status) => {
    if (status === "red") return "bg-red-500";
    if (status === "yellow") return "bg-yellow-500";
    return "";
  };

  return (
    <div>
      <PageHeader title="כל המטופלים" subtitle={`${sortedPatients.length} מטופלים`} />
      
      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4 pb-32">
        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או ת״ז..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-4 pr-10 h-8 text-sm py-1"
          />
        </div>

        {/* Loading */}
        {loadingPatients && Array(5).fill(0).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}

        {/* No results */}
        {!loadingPatients && sortedPatients.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>{searchQuery ? "לא נמצאו מטופלים" : "אין מטופלים במערכת"}</p>
            </CardContent>
          </Card>
        )}

        {/* Patient list */}
        {sortedPatients.map((patient) => (
          <Link key={patient.id} to={`/timeline/${patient.id}`}>
            <Card className={`hover:shadow-md transition-shadow border-2 ${getStatusColor(patient.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{patient.full_name}</p>
                      {patient.status && (
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusDot(patient.status)}`} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>ת״ז: {patient.id_number}</span>
                      {patient.age !== null && <span>•</span>}
                      {patient.age !== null && <span>גיל: {patient.age}</span>}
                    </div>
                    {patient.eventCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {patient.eventCount} אירוע{patient.eventCount > 1 ? "ים" : ""}
                      </p>
                    )}
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}