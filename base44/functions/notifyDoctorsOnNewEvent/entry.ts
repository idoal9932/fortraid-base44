import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      patient_name,
      patient_id_number,
      chief_complaint,
      hpi,
      bp,
      hr,
      spo2,
      temp,
      glucose,
      physical_exam,
      treatment_given,
      site_name,
      paramedic_name,
      event_id,
    } = await req.json();

    // Get all doctors
    const users = await base44.asServiceRole.entities.User.list();
    const doctors = users.filter((u) => u.custom_role === "doctor");

    // Send emails to all doctors
    const emailPromises = doctors.map((doctor) =>
      base44.integrations.Core.SendEmail({
        to: doctor.email,
        subject: `התקבל עדכון בfortrAID - ${patient_name}`,
        body: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;">
          <h2>התקבל עדכון בfortrAID - ${patient_name}</h2>
          <p><strong>מטופל:</strong> ${patient_name} | ת"ז: ${patient_id_number}</p>
          <p><strong>תלונה עיקרית:</strong> ${chief_complaint}</p>
          ${hpi ? `<p><strong>מחלה נוכחית:</strong> ${hpi}</p>` : ""}
          <p><strong>מדדים:</strong> BP ${bp || "—"} | HR ${hr || "—"} bpm | SpO2 ${spo2 || "—"}% ${temp ? `| חום ${temp}°C` : ""} ${glucose ? `| סוכר ${glucose} mg/dL` : ""}</p>
          ${physical_exam ? `<p><strong>בדיקה גופנית:</strong> ${physical_exam}</p>` : ""}
          ${treatment_given ? `<p><strong>טיפול שניתן:</strong> ${treatment_given}</p>` : ""}
          <p><strong>אתר:</strong> ${site_name || "לא צוין"} | <strong>פראמדיק:</strong> ${paramedic_name}</p>
        </div>`,
      }).catch(() => {})
    );

    await Promise.all(emailPromises);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});