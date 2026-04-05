import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_name, event_id, note_content } = await req.json();

    // Get all users with custom_role: doctor
    const users = await base44.asServiceRole.entities.User.list();
    const doctors = users.filter((u) => u.custom_role === "doctor");

    // Send emails to all doctors
    const emailPromises = doctors.map((doctor) =>
      base44.integrations.Core.SendEmail({
        to: doctor.email,
        subject: `התקבל עדכון בfortrAID - ${patient_name}`,
        body: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;">
          <h2>התקבל עדכון בfortrAID - ${patient_name}</h2>
          <p><strong>סוג עדכון:</strong> הערה חדשה</p>
          <p><strong>כותב:</strong> ${user.full_name}</p>
          <p><strong>הערה:</strong> ${note_content}</p>
        </div>`,
      }).catch(() => {})
    );

    await Promise.all(emailPromises);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});