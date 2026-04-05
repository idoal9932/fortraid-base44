import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      patient_id,
      image_id,
      author_name,
      caption,
    } = await req.json();

    // Get all doctors
    const users = await base44.asServiceRole.entities.User.list();
    const doctors = users.filter((u) => u.custom_role === "doctor");

    // Send emails to all doctors
    const emailPromises = doctors.map((doctor) =>
      base44.integrations.Core.SendEmail({
        to: doctor.email,
        subject: `התקבל עדכון בfortrAID - תמונה חדשה`,
        body: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;">
          <h2>התקבל עדכון בfortrAID</h2>
          <p><strong>סוג עדכון:</strong> תמונה חדשה</p>
          <p><strong>כותב:</strong> ${author_name}</p>
          ${caption ? `<p><strong>כיתוב:</strong> ${caption}</p>` : ""}
        </div>`,
      }).catch(() => {})
    );

    await Promise.all(emailPromises);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});