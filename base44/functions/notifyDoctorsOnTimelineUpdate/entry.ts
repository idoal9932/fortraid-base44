import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id, patient_name, content_type } = await req.json();

    // Get all doctors
    const users = await base44.entities.User.list();
    const doctors = users.filter((u) => u.role === "doctor");

    // Send email to all doctors
    for (const doc of doctors) {
      await base44.integrations.Core.SendEmail({
        to: doc.email,
        subject: `התקבל עדכון בfortrAID - ${patient_name}`,
        body: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;">
          <h2>התקבל עדכון בfortrAID - ${patient_name}</h2>
          <p><strong>סוג עדכון:</strong> ${content_type}</p>
          <p><strong>מועד:</strong> ${new Date().toLocaleString('he-IL')}</p>
        </div>`,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});