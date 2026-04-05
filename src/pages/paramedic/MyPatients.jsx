import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ChevronLeft, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";

export default function MyPatients() {
  const { user } = useAuth();
  const [displayCount, setDisplayCount] = useState(20);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["site-events", user?.current_site],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      console.log("user site:", user?.current_site);
      console.log("user site name:", user?.current_site_name);
      
      let result;
      if (user?.current_site) {
        result = await base44.entities.MedicalEvent.filter({ site_id: user?.current_site }, "-created_date");
      } else {
        result = await base44.entities.MedicalEvent.list("-created_date");
      }
      
      console.log("all events:", result);
      return result;
    },
    enabled: !!user,
  });

  const prefetchPatient = (event) => {
    const pid = event.patient_id;
    queryClient.prefetchQuery({
      queryKey: ["patient", pid],
      queryFn: async () => {
        const patients = await base44.entities.Patient.filter({ id: pid });
        return patients[0];
      },
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["patient-events", pid],
      queryFn: () => base44.entities.MedicalEvent.filter({ patient_id: pid }, "-event_date"),
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["patient-notes", pid],
      queryFn: () => base44.entities.Note.filter({ patient_id: pid }, "-created_date"),
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["patient-checkups", pid],
      queryFn: () => base44.entities.Checkup.filter({ patient_id: pid }, "-created_date"),
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["patient-images", pid],
      queryFn: () => base44.entities.PatientImage.filter({ patient_id: pid }, "-created_date"),
      staleTime: 30 * 1000,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["site-events", user?.current_site] });
    setIsRefreshing(false);
  };

  // קבץ לפי patient_id — כרטיס אחד למטופל עם האירוע האחרון
  const patients = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const existing = map.get(event.patient_id);
      if (!existing || new Date(event.event_date) > new Date(existing.event_date)) {
        map.set(event.patient_id, event);
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }, [events]);

  const displayedPatients = patients.slice(0, displayCount);
  const hasMore = patients.length > displayCount;

  return (
    <div>
      <PageHeader 
        title="מטופלי האתר" 
        subtitle={`${patients.length} מטופלים`}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-primary-foreground hover:bg-white/20"
        >
          <RotateCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </PageHeader>
      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-3">
        {isLoading && Array(3).fill(0).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}

        {!isLoading && events.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>אין מטופלים עדיין</p>
            </CardContent>
          </Card>
        )}

        {displayedPatients.map((event, index) => (
          <motion.div
            key={event.patient_id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: index * 0.08 }}
          >
          <Link to={`/timeline/${event.patient_id}`}>
            <motion.div
              whileTap={{ scale: 0.99 }}
              onMouseEnter={() => prefetchPatient(event)}
              onTouchStart={() => prefetchPatient(event)}
            >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#dc2626]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{event.patient_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{event.chief_complaint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mr-10">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy HH:mm") : ""}
                      </span>
                      <StatusBadge status={event.status} />
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0 mt-2" />
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </Link>
          </motion.div>
        ))}

        {hasMore && (
          <div className="flex justify-center pt-2 pb-6">
            <button
              onClick={() => setDisplayCount(c => c + 20)}
              className="text-[#dc2626] font-semibold text-sm hover:underline"
            >
              טען עוד
            </button>
          </div>
        )}
      </div>
    </div>
  );
}