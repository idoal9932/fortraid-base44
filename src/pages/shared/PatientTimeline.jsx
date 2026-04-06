import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Send, Trash2, MessageSquare, Stethoscope, Image as ImageIcon } from "lucide-react";
const formatDRC = (dateValue, withTime = false) => {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { timeZone: "Africa/Kinshasa", day: "2-digit", month: "2-digit", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-GB", { timeZone: "Africa/Kinshasa", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
};
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { EventCard, NoteCard, CheckupCard, PatientImageCard } from "@/components/timeline/TimelineCards";
import AddCheckupForm from "@/components/timeline/AddCheckupForm";
import AddImageForm from "@/components/timeline/AddImageForm";

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <Card className="w-full max-w-sm border-destructive">
        <CardContent className="p-5 space-y-4">
          <p className="font-semibold text-destructive">{message}</p>
          <div className="flex gap-3">
            <Button className="flex-1 bg-destructive hover:bg-destructive/90" onClick={onConfirm} disabled={loading}>
              {loading ? "מוחק..." : "כן, מחק"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCancel}>ביטול</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientTimeline() {
  const patientId = window.location.pathname.split("/timeline/")[1];
  const { user, viewAsRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [noteContent, setNoteContent] = useState("");
  const [activeForm, setActiveForm] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 2500);
  };
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const role = viewAsRole || user?.custom_role;

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["patient-events", patientId],
    queryFn: () => base44.entities.MedicalEvent.filter({ patient_id: patientId }, "-event_date"),
    enabled: !!patientId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: () => base44.entities.Note.filter({ patient_id: patientId }, "-created_date"),
    enabled: !!patientId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: checkups = [], isLoading: loadingCheckups } = useQuery({
    queryKey: ["patient-checkups", patientId],
    queryFn: () => base44.entities.Checkup.filter({ patient_id: patientId }, "-created_date"),
    enabled: !!patientId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: images = [], isLoading: loadingImages } = useQuery({
    queryKey: ["patient-images", patientId],
    queryFn: () => base44.entities.PatientImage.filter({ patient_id: patientId }, "-created_date"),
    enabled: !!patientId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content) => {
      const latestEvent = events[0];
      await base44.entities.Note.create({
        event_id: latestEvent?.id || "",
        patient_id: patientId,
        author_name: user?.full_name || "",
        note_type: role === "doctor" ? "doctor_note" : "followup",
        content,
      });

      // Send notification emails in background
      base44.functions.invoke('notifyOnTimelineUpdate', {
        patient_name: patient?.full_name || "מטופל",
        event_id: latestEvent?.id || "",
        note_content: content,
      }).catch(() => {});
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["patient-notes", patientId] });
      const previous = queryClient.getQueryData(["patient-notes", patientId]);
      const optimisticNote = {
        id: `optimistic-${Date.now()}`,
        patient_id: patientId,
        author_name: user?.full_name || "",
        note_type: role === "doctor" ? "doctor_note" : "followup",
        content,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(["patient-notes", patientId], (old = []) => [optimisticNote, ...old]);
      // סגור טופס ועדכן UI מיידית
      setNoteContent("");
      setActiveForm(null);
      showToast("ההערה נוספה");
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["patient-notes", patientId], context.previous);
      showToast("שגיאה בשמירה, נסה שוב", true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });

  const handleDeleteCard = async (id, type) => {
    try {
      if (type === "event") {
        await base44.entities.MedicalEvent.delete(id);
        queryClient.invalidateQueries({ queryKey: ["patient-events", patientId] });
        queryClient.invalidateQueries({ queryKey: ["site-events"] });
        queryClient.invalidateQueries({ queryKey: ["all-events"] });
      } else if (type === "note") {
        await base44.entities.Note.delete(id);
        queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
      } else if (type === "checkup") {
        await base44.entities.Checkup.delete(id);
        queryClient.invalidateQueries({ queryKey: ["patient-checkups", patientId] });
      } else if (type === "image") {
        await base44.entities.PatientImage.delete(id);
        queryClient.invalidateQueries({ queryKey: ["patient-images", patientId] });
      }
    } catch {
      // Item not found or already deleted - refresh
      window.location.reload();
    }
  };

  const handleDeleteCurrentEvent = async () => {
    if (!confirmDeleteEvent) return;
    setDeletingEvent(true);
    try {
      await base44.functions.invoke('deleteEvent', {
        event_id: confirmDeleteEvent,
      });
      navigate("/my-patients");
    } catch {
      // Event not found or already deleted - refresh and navigate
      window.location.reload();
    } finally {
      setDeletingEvent(false);
      setConfirmDeleteEvent(null);
    }
  };

  const refreshAll = (key) => {
    queryClient.invalidateQueries({ queryKey: [key, patientId] });
  };

  const formatDateSafely = (dateValue) => {
    if (!dateValue) return null;
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) return null;
    return dateValue;
  };

  const allItems = [
    ...events.map((e) => ({ type: "event", date: formatDateSafely(e.event_date || e.created_date), data: e })),
    ...notes.map((n) => ({ type: "note", date: formatDateSafely(n.created_date), data: n })),
    ...checkups.map((c) => ({ type: "checkup", date: formatDateSafely(c.created_date), data: c })),
    ...images.map((img) => ({ type: "image", date: formatDateSafely(img.created_date), data: img })),
  ].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date));

  const displayedItems = allItems.slice(0, displayCount);
  const hasMore = allItems.length > displayCount;

  const isLoading = loadingPatient || loadingEvents || loadingNotes || loadingCheckups || loadingImages;
  const latestEvent = events[0];

  return (
    <div>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
              background: toastMsg.isError ? "#dc2626" : "#1e2a38",
              borderRadius: 12, padding: "12px 20px",
              color: "#fff", fontSize: 15, fontWeight: 600,
              zIndex: 50, whiteSpace: "nowrap", pointerEvents: "none"
            }}
          >
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDeleteEvent && (
        <ConfirmDialog
          message="למחוק את האירוע הנוכחי? פעולה זו לא ניתנת לביטול."
          onConfirm={handleDeleteCurrentEvent}
          onCancel={() => setConfirmDeleteEvent(null)}
          loading={deletingEvent}
        />
      )}

      {activeForm === "checkup" && (
        <AddCheckupForm
          patientId={patientId}
          authorName={user?.full_name}
          latestEventId={latestEvent?.id}
          onSaved={() => { setActiveForm(null); refreshAll("patient-checkups"); }}
          onCancel={() => setActiveForm(null)}
          onSaveError={(msg) => showToast(msg, true)}
        />
      )}

      {activeForm === "image" && (
        <AddImageForm
          patientId={patientId}
          authorName={user?.full_name}
          onSaved={() => setActiveForm(null)}
          onSaveComplete={() => refreshAll("patient-images")}
          onCancel={() => setActiveForm(null)}
          onSaveError={(msg) => showToast(msg, true)}
        />
      )}

      <PageHeader
        title={patient?.full_name || "טוען..."}
        subtitle={patient ? `ת״ז: ${patient.id_number}` : ""}
      >
        <div className="flex items-center gap-2">
          {latestEvent && (
            <Button size="sm" variant="destructive" className="text-xs h-8 gap-1" onClick={() => setConfirmDeleteEvent(latestEvent.id)}>
              <Trash2 className="w-3.5 h-3.5" />
              מחק אירוע
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </PageHeader>

      <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4 pb-8">
        {patient && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {patient.date_of_birth && !isNaN(new Date(patient.date_of_birth)) && (
                   <div>
                     <span className="text-muted-foreground text-xs">תאריך לידה</span>
                     <p className="font-medium">{formatDRC(patient.date_of_birth)}</p>
                   </div>
                 )}
                {patient.blood_type && (
                  <div>
                    <span className="text-muted-foreground text-xs">סוג דם</span>
                    <p className="font-medium">{patient.blood_type}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">אלרגיות</span>
                    <p className="font-medium text-destructive">{patient.allergies}</p>
                  </div>
                )}
                {patient.chronic_conditions && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">מחלות רקע</span>
                    <p className="font-medium">{patient.chronic_conditions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">טיימליין</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8"
              onClick={() => setActiveForm(activeForm === "note" ? null : "note")}>
              <MessageSquare className="w-3.5 h-3.5" />
              הוסף הערה
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8"
              onClick={() => setActiveForm("checkup")}>
              <Stethoscope className="w-3.5 h-3.5" />
              בדיקה
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8"
              onClick={() => setActiveForm("image")}>
              <ImageIcon className="w-3.5 h-3.5" />
              תמונה
            </Button>
          </div>
        </div>

        {activeForm === "note" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea placeholder="כתוב הערה..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button onClick={() => addNoteMutation.mutate(noteContent)}
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                className="w-full gap-2 relative overflow-hidden">
                {addNoteMutation.isPending && (
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                    style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.22)", pointerEvents: "none" }}
                  />
                )}
                <Send className="w-4 h-4" />
                שלח הערה
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && Array(3).fill(0).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24" /></CardContent></Card>
        ))}

        <div className="relative">
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-6">
            {displayedItems.map((item, idx) => {
              const eventDate = item.type === "event" ? item.data.event_date || item.data.created_date : (item.data.event_id || "");
              const prevEventDate = idx > 0 ? (displayedItems[idx - 1].type === "event" ? displayedItems[idx - 1].data.event_date || displayedItems[idx - 1].data.created_date : (displayedItems[idx - 1].data.event_id || "")) : null;
              const isNewEvent = idx > 0 && eventDate !== prevEventDate;

              const dotColor = item.type === "event" ? "bg-primary"
                : item.type === "checkup" ? "bg-emerald-500"
                : item.type === "image" ? "bg-blue-500"
                : "bg-muted-foreground";

              return (
                <div key={idx}>
                  {isNewEvent && eventDate && !isNaN(new Date(eventDate)) && (
                     <div className="flex items-center justify-center my-6">
                       <div className="absolute w-32 h-px bg-border" />
                       <span className="relative bg-background px-3 text-xs text-muted-foreground font-medium">
                         {formatDRC(eventDate)}
                       </span>
                     </div>
                   )}
                  <div className="relative pr-10">
                    <div className="flex items-center gap-1 mb-1">
                       <div className={`absolute right-2.5 w-3 h-3 rounded-full border-2 border-card z-10 ${dotColor}`} />
                       <span className="text-xs text-muted-foreground">
                         {formatDRC(item.date, true)}
                       </span>
                     </div>
                    {item.type === "event" && (
                      <EventCard
                        event={item.data}
                        onDelete={handleDeleteCard}
                        onEdit={() => refreshAll("patient-events")}
                        canEdit={item.data.created_by === user?.email || role === "doctor" || role === "admin"}
                        userRole={role}
                      />
                    )}
                    {item.type === "note" && (
                      <NoteCard
                        note={item.data}
                        onDelete={handleDeleteCard}
                        onEdit={() => refreshAll("patient-notes")}
                        canEdit={item.data.created_by === user?.email || role === "doctor" || role === "admin"}
                      />
                    )}
                    {item.type === "checkup" && (
                      <CheckupCard
                        checkup={item.data}
                        onDelete={handleDeleteCard}
                        canEdit={item.data.created_by === user?.email || role === "doctor" || role === "admin"}
                      />
                    )}
                    {item.type === "image" && (
                      <PatientImageCard
                        image={item.data}
                        onDelete={handleDeleteCard}
                        canEdit={item.data.created_by === user?.email || role === "doctor" || role === "admin"}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasMore && (
         <div className="flex justify-center pt-2 pb-6">
           <button
             onClick={() => setDisplayCount(c => c + 10)}
             className="text-[#dc2626] font-semibold text-sm hover:underline"
           >
             טען עוד
           </button>
         </div>
        )}

        {!isLoading && allItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>אין רשומות עדיין</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}