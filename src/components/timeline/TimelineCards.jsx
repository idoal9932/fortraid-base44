import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Pencil, MessageSquare, Activity, Stethoscope, Image as ImageIcon, Share2 } from "lucide-react";
import CopyToWhatsApp from "@/components/shared/CopyToWhatsApp";
import { format } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";
import VitalsDisplay from "@/components/shared/VitalsDisplay";
import EditEventForm from "@/components/shared/EditEventForm";

function parseField(raw, key) {
  if (!raw) return "";
  const re = new RegExp(`${key}: ([^\\n]+)`);
  const m = raw.match(re);
  return m ? m[1] : "";
}

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

export function EventCard({ event, onDelete, onEdit, canEdit, userRole }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const treatmentRaw = event.treatment_given || "";
  const background = parseField(treatmentRaw, "רקע");
  const hpi = parseField(treatmentRaw, "מחלה נוכחית");
  const physical_exam = parseField(treatmentRaw, "בדיקה גופנית");
  const treatment = parseField(treatmentRaw, "טיפול");

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(event.id, "event");
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <>
      {editing && (
        <EditEventForm event={event} onSaved={() => { setEditing(false); onEdit(); }} onCancel={() => setEditing(false)} />
      )}
      {confirmDelete && (
        <ConfirmDialog message="למחוק את האירוע הרפואי הזה?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={deleting} />
      )}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">אירוע רפואי</span>
              {event.id && (
                <span className="text-xs text-muted-foreground font-normal ml-1">#{event.id.slice(0, 4).toUpperCase()}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={event.status} />
              {canEdit && (
                <>
                  <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setEditing(true)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setConfirmDelete(true)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setExpanded(!expanded)}>
                <span className="text-xs">{expanded ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>
          <p className="text-sm">{event.chief_complaint}</p>
          <VitalsDisplay event={event} />
          {expanded && (
            <div className="space-y-2 pt-1">
              {background && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">רקע רפואי</p><p className="text-sm">{background}</p></div>}
              {hpi && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">מחלה נוכחית</p><p className="text-sm">{hpi}</p></div>}
              {physical_exam && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">בדיקה גופנית</p><p className="text-sm">{physical_exam}</p></div>}
              {treatment && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">טיפול שניתן</p><p className="text-sm">{treatment}</p></div>}
              {(userRole === "paramedic" || userRole === "admin") && (
                <CopyToWhatsApp event={event} />
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{event.paramedic_name}</span>
            <span>•</span>
            <span>{event.site_name}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function NoteCard({ note, onDelete, onEdit, canEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const noteTypeLabels = { doctor_note: "תגובת רופא", followup: "עדכון מעקב", update: "עדכון" };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(note.id, "note");
    setDeleting(false);
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Note.update(note.id, { content: editContent });
    await onEdit();
    setSaving(false);
    setEditing(false);
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog message="למחוק הערה זו?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={deleting} />
      )}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{noteTypeLabels[note.note_type] || "הערה"}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setEditing(!editing)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setConfirmDelete(true)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "שומר..." : "שמור"}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>ביטול</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{note.content}</p>
          )}
          <p className="text-xs text-muted-foreground">{note.author_name}</p>
        </CardContent>
      </Card>
    </>
  );
}

export function CheckupCard({ checkup, onDelete, canEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(checkup.id, "checkup");
    setDeleting(false);
    setConfirmDelete(false);
  };

  const vitalsArr = [
    checkup.vitals_hr && `דופק: ${checkup.vitals_hr} bpm`,
    checkup.vitals_bp && `ל"ד: ${checkup.vitals_bp}`,
    checkup.vitals_spo2 && `SpO2: ${checkup.vitals_spo2}%`,
    checkup.vitals_temp && `חום: ${checkup.vitals_temp}°C`,
    checkup.vitals_glucose && `סוכר: ${checkup.vitals_glucose} mg/dL`,
  ].filter(Boolean);

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={checkup.image_url} alt="בדיקה" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog message="למחוק בדיקה זו?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={deleting} />
      )}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-sm text-emerald-700">בדיקה</span>
            </div>
            {canEdit && (
              <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setConfirmDelete(true)}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {vitalsArr.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vitalsArr.map((v, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">{v}</span>
              ))}
            </div>
          )}
          {checkup.note && <p className="text-sm">{checkup.note}</p>}
          {checkup.image_url && (
            <img src={checkup.image_url} alt="תמונה" className="w-full rounded-xl object-cover max-h-40 cursor-pointer" onClick={() => setLightbox(true)} />
          )}
          <p className="text-xs text-muted-foreground">{checkup.author_name}</p>
        </CardContent>
      </Card>
    </>
  );
}

export function PatientImageCard({ image, onDelete, canEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(image.id, "image");
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={image.image_url} alt="תמונה" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog message="למחוק תמונה זו?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={deleting} />
      )}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm text-blue-600">תמונה</span>
            </div>
            {canEdit && (
              <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => setConfirmDelete(true)}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <img src={image.image_url} alt="תמונה" className="w-full rounded-xl object-cover max-h-48 cursor-pointer" onClick={() => setLightbox(true)} />
          {image.caption && <p className="text-sm text-muted-foreground">{image.caption}</p>}
          <p className="text-xs text-muted-foreground">{image.author_name}</p>
        </CardContent>
      </Card>
    </>
  );
}