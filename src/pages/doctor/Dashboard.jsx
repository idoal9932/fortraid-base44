import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCached, setCached } from "@/lib/localCache";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Users, ChevronLeft, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";

export default function DoctorDashboard() {
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [displayCount, setDisplayCount] = useState(20);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["all-events"],
    queryFn: () => base44.entities.MedicalEvent.list("-created_date"),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const cached = getCached("sites");
      if (cached) return cached;
      const data = await base44.entities.Site.filter({ active: true });
      setCached("sites", data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const prefetchEvent = (event) => {
    queryClient.prefetchQuery({
      queryKey: ["event", event.id],
      queryFn: async () => {
        const events = await base44.entities.MedicalEvent.filter({ id: event.id });
        return events[0];
      },
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["event-notes", event.id],
      queryFn: () => base44.entities.Note.filter({ event_id: event.id }, "-created_date"),
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["event-images", event.id],
      queryFn: () => base44.entities.EventImage.filter({ event_id: event.id }, "-created_date"),
      staleTime: 30 * 1000,
    });
  };

  const openEvents = events.filter((e) => e.status === "open" || e.status === "followup");

  const siteStats = sites.map((site) => ({
    ...site,
    openCount: openEvents.filter((e) => e.site_id === site.id).length,
  }));

  let filteredEvents = events;

  if (statusFilter !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.status === statusFilter);
  }

  if (siteFilter !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.site_id === siteFilter);
  }

  const displayedEvents = filteredEvents.slice(0, displayCount);
  const hasMore = filteredEvents.length > displayCount;

  return (
    <div>
      <PageHeader title="דשבורד רופא" subtitle="סקירה כללית" />
      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {siteStats.map((site) => (
            <Card key={site.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                   <MapPin className="w-4 h-4 text-teal-400" />
                   <span className="font-medium text-sm truncate">{site.name}</span>
                 </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-3xl font-bold text-teal-400">{site.openCount}</span>
                   <span className="text-xs text-muted-foreground">אירועים פתוחים</span>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-bold">אירועים</h3>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="followup">מעקב</SelectItem>
                <SelectItem value="closed">סגור</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="כל האתרים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל האתרים</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingEvents && Array(3).fill(0).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
        ))}

        {!loadingEvents && filteredEvents.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>אין אירועים פעילים</p>
            </CardContent>
          </Card>
        )}

        {displayedEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: index * 0.08 }}
          >
          <Link to={`/event/${event.id}`}>
            <motion.div
              whileTap={{ scale: 0.99 }}
              onMouseEnter={() => prefetchEvent(event)}
              onTouchStart={() => prefetchEvent(event)}
            >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{event.patient_name}</p>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{event.chief_complaint}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.event_date && !isNaN(new Date(event.event_date)) ? format(new Date(event.event_date), "dd/MM HH:mm") : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.site_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.paramedic_name}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
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
              className="text-teal-400 font-semibold text-sm hover:underline"
            >
              טען עוד
            </button>
          </div>
        )}
      </div>
    </div>
  );
}