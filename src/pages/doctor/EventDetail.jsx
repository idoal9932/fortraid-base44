import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Send, FileText, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import VitalsDisplay from "@/components/shared/VitalsDisplay";
import CopyToWhatsApp from "@/components/shared/CopyToWhatsApp";
import EditEventForm from "@/components/shared/EditEventForm";

function parseField(raw, key) {
  if (!raw) return "";
  const re = new RegExp(`${key}: ([^\\n]+)`);
  const m = raw.match(re);
  return m ? m[1] : "";
}

export default function EventDetail() {
  const eventId = window.location.pathname.split("/event/")[1];
  const { user, viewAsRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [response, setResponse] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 2500);
  };

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const events = await base44.entities.MedicalEvent.filter({ id: eventId });
      return events[0];
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["event-notes", eventId],
    queryFn: () => base44.entities.Note.filter({ event_id: eventId }, "-created_date"),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["event-images", eventId],
    queryFn: () => base44.entities.EventImage.filter({ event_id: eventId }, "-created_date"),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const statusMutation = useMutation({
    mutationFn: async (status) => {
      await base44.entities.MedicalEvent.update(eventId, { status });
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });
      const previous = queryClient.getQueryData(["event", eventId]);
      queryClient.setQueryData(["event", eventId], (old) => old ? { ...old, status: newStatus } : old);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["event", eventId], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
      queryClient.invalidateQueries({ queryKey: ["site-events"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MedicalEvent.delete(eventId);
    },
    onSuccess: () => {
      navigate(-1);
    },
  });

  const responseMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Note.create({
        event_id: eventId,
        patient_id: event?.patient_id || "",
        author_name: user?.full_name || "",
        note_type: "doctor_note",
        content,
      });
      // שליחת אימייל ברקע
      if (event?.created_by) {
        base44.integrations.Core.SendEmail({
          to: event.created_by,
          subject: `תגובת רופא - ${event.patient_name}`,
          body: `<div dir="rtl" style="font-family:Arial,sans-serif;">
            <h2>תגובת רופא</h2>
            <p><strong>מטופל:</strong> ${event.patient_name}</p>
            <p><strong>רופא:</strong> ${user?.full_name}</p>
            <p><strong>תגובה:</strong> ${content}</p>
          </div>`,
        }).catch(() => {});
      }
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["event-notes", eventId] });
      const previous = queryClient.getQueryData(["event-notes", eventId]);
      const optimisticNote = {
        id: `optimistic-${Date.now()}`,
        event_id: eventId,
        author_name: user?.full_name || "",
        note_type: "doctor_note",
        content,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(["event-notes", eventId], (old = []) => [optimisticNote, ...old]);
      // סגור ועדכן מיידית
      setResponse("");
      showToast("התגובה נשלחה ✓");
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["event-notes", eventId], context.previous);
      showToast("שגיאה בשמירה, נסה שוב", true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-notes", eventId] });
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="טוען..." />
        <div className="px-4 -mt-3 max-w-2xl mx-auto">
          <Card><CardContent className="p-4"><Skeleton className="h-48" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!event) return <div><PageHeader title="אירוע לא נמצא" /></div>;

  const role = viewAsRole || user?.custom_role;
  const isParamedic = role === "paramedic";
  const isDoctor = role === "doctor" || role === "admin";
  const isOwner = event.created_by === user?.email;
  const canEdit = isDoctor || (isParamedic && isOwner);
  const canDelete = isParamedic && isOwner;

  const treatmentRaw = event.treatment_given || "";
  const background = parseField(treatmentRaw, "רקע");
  const hpi = parseField(treatmentRaw, "מחלה נוכחית");
  const physical_exam = parseField(treatmentRaw, "בדיקה גופנית");
  const treatment = parseField(treatmentRaw, "טיפול");

  const statusConfig = [
    { value: "open", label: "פתוח", activeClass: "bg-orange-500 text-white border-orange-500", outlineClass: "border-orange-300 text-orange-500 hover:bg-orange-50" },
    { value: "followup", label: "מעקב", activeClass: "bg-blue-500 text-white border-blue-500", outlineClass: "border-blue-300 text-blue-500 hover:bg-blue-50" },
    { value: "closed", label: "סגור", activeClass: "bg-green-500 text-white border-green-500", outlineClass: "border-green-300 text-green-500 hover:bg-green-50" },
  ];

  return (
     <>
       <AnimatePresence>
         {toastMsg && (
           <motion.div
             key="toast"
             initial={{ opacity: 0, y: 12 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2, ease: "easeOut" }}
             style={{
               position: "fixed", bottom: 90, left: 0, right: 0, margin: "0 auto", width: "fit-content",
               background: toastMsg?.isError ? "#dc2626" : "#1e2a38", borderRadius: 12, padding: "12px 20px",
               color: "#fff", fontSize: 15, fontWeight: 600,
               zIndex: 50, whiteSpace: "nowrap", pointerEvents: "none"
             }}
           >
             {toastMsg?.msg}
           </motion.div>
         )}
       </AnimatePresence>

       {expandedImage && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setExpandedImage(null)}>
           <div className="relative max-w-2xl w-full">
             <button
               onClick={() => setExpandedImage(null)}
               className="absolute -top-10 -right-10 text-white hover:opacity-70"
             >
               <X className="w-8 h-8" />
             </button>
             <img src={expandedImage.image_url} alt="תמונה מוגדלת" className="w-full h-auto rounded-lg" />
             {expandedImage.caption && (
               <p className="text-white text-center mt-3 text-sm">{expandedImage.caption}</p>
             )}
           </div>
         </div>
       )}

       {editing && (
         <EditEventForm
           event={event}
           onSaved={() => {
             setEditing(false);
             queryClient.invalidateQueries({ queryKey: ["event", eventId] });
           }}
           onCancel={() => setEditing(false)}
         />
       )}

       <div>
        <PageHeader title={event.patient_name} subtitle={`אירוע מ-${event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy") : ""}`}>
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </PageHeader>

        <div className="px-4 -mt-3 max-w-2xl mx-auto space-y-4 pb-8">

          {/* Event details card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">פרטי האירוע</h3>
                <StatusBadge status={event.status} />
              </div>

              {event.chief_complaint && (
                <DetailField label="תלונה עיקרית" value={event.chief_complaint} />
              )}
              {background && <DetailField label="רקע רפואי" value={background} />}
              {hpi && <DetailField label="מחלה נוכחית" value={hpi} />}

              <VitalsDisplay event={event} />

              {physical_exam && <DetailField label="בדיקה גופנית" value={physical_exam} />}
               {treatment && <DetailField label="טיפול שניתן" value={treatment} />}

               {images.length > 0 && (
                 <div>
                   <p className="text-xs text-muted-foreground mb-2">תמונות ({images.length})</p>
                   <div className="grid grid-cols-3 gap-2">
                     {images.map((img) => (
                       <button
                         key={img.id}
                         onClick={() => setExpandedImage(img)}
                         className="w-full h-24 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                       >
                         <img src={img.image_url} alt="תמונה" className="w-full h-full object-cover" />
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-1">
                 <div><span>פראמדיק: </span><strong>{event.paramedic_name}</strong></div>
                 <div><span>אתר: </span><strong>{event.site_name}</strong></div>
               </div>

               {isParamedic && <CopyToWhatsApp event={event} imageCount={images.length} />}
            </CardContent>
          </Card>

          {/* Edit / Delete actions */}
          {(canEdit || canDelete) && (
            <div className="flex gap-3">
              {canEdit && (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4" />
                  ערוך דוח
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  מחק דוח
                </Button>
              )}
            </div>
          )}

          {/* Delete confirmation */}
          {confirmDelete && (
            <Card className="border-destructive">
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold text-destructive">האם אתה בטוח? פעולה זו לא ניתנת לביטול</p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "מוחק..." : "כן, מחק"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>ביטול</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status buttons — doctor only */}
          {isDoctor && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm">שנה סטטוס</h3>
                <div className="grid grid-cols-3 gap-2">
                  {statusConfig.map(({ value, label, activeClass, outlineClass }) => (
                    <button
                      key={value}
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(value)}
                      className={`h-12 rounded-xl border-2 font-semibold text-base transition-all ${
                        event.status === value ? activeClass : outlineClass
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Doctor response — doctor only */}
          {isDoctor && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm">הוסף תגובה / המלצה</h3>
                <Textarea
                  placeholder="כתוב תגובה..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
                <Button
                  onClick={() => responseMutation.mutate(response)}
                  disabled={!response.trim() || responseMutation.isPending}
                  className="w-full gap-2 relative overflow-hidden"
                >
                  {responseMutation.isPending && (
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "linear" }}
                      style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.22)", pointerEvents: "none" }}
                    />
                  )}
                  <Send className="w-4 h-4" />
                  {responseMutation.isPending ? "שולח..." : "שלח תגובה"}
                </Button>
              </CardContent>
            </Card>
          )}

          {notes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm">תגובות קודמות</h3>
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{note.author_name}</span>
                      {note.note_type && (
                        <>
                          <span>·</span>
                          <span>
                            {note.note_type === "doctor_note" ? "רופא" :
                             note.note_type === "followup" ? "פראמדיק" :
                             note.note_type === "update" ? "פראמדיק" : ""}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(note.created_date), "dd/MM HH:mm")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center pb-4">
            <Link to={`/timeline/${event.patient_id}`}>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                טיימליין מלא של המטופל
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}