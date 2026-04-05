import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Delete all notes for this event
    const notes = await base44.asServiceRole.entities.Note.filter({ event_id });
    for (const note of notes) {
      await base44.asServiceRole.entities.Note.delete(note.id);
    }

    // Delete all event images for this event
    const images = await base44.asServiceRole.entities.EventImage.filter({ event_id });
    for (const image of images) {
      await base44.asServiceRole.entities.EventImage.delete(image.id);
    }

    // Delete the event itself
    await base44.asServiceRole.entities.MedicalEvent.delete(event_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});