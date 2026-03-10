import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "KickoffClient <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error [${res.status}]: ${body}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find submissions that:
    // 1. Have an AI report (kickoff pack generated)
    // 2. Status is still "pending" (not yet approved/changed)
    // 3. Created more than 3 days ago
    // 4. Have a portal_token
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: pendingSubs } = await supabase
      .from("submissions")
      .select("id, client_name, client_email, portal_token, template_id, created_at")
      .eq("status", "pending")
      .lt("created_at", threeDaysAgo.toISOString())
      .not("portal_token", "is", null);

    if (!pendingSubs || pendingSubs.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which ones have AI reports (meaning kickoff pack was generated)
    const subIds = pendingSubs.map((s) => s.id);
    const { data: reports } = await supabase
      .from("ai_reports")
      .select("submission_id")
      .in("submission_id", subIds);

    const reportSubIds = new Set((reports || []).map((r) => r.submission_id));
    const eligibleSubs = pendingSubs.filter((s) => reportSubIds.has(s.id));

    // Check which have already been reminded (using a simple approach: 
    // only send one reminder per submission by checking if created_at is 
    // between 3 and 6 days ago - avoid spamming)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const toRemind = eligibleSubs.filter((s) => {
      const created = new Date(s.created_at);
      return created >= sixDaysAgo && created <= threeDaysAgo;
    });

    let sent = 0;
    for (const sub of toRemind) {
      // Get workspace business name
      const { data: template } = await supabase
        .from("templates")
        .select("workspace_id")
        .eq("id", sub.template_id)
        .single();

      if (!template) continue;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("business_name")
        .eq("id", template.workspace_id)
        .single();

      const businessName = workspace?.business_name || "Your Service Provider";
      const portalUrl = `https://kickoffclient.lovable.app/portal/${sub.portal_token}`;

      try {
        await sendEmail(sub.client_email, `${businessName} — Reminder: Your Kickoff Pack Awaits`, `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #111; margin-bottom: 8px;">Hi ${sub.client_name},</h2>
            <p style="color: #444; line-height: 1.6;">
              Just a friendly reminder — <strong>${businessName}</strong> prepared your project kickoff pack a few days ago and it's still waiting for your review.
            </p>
            <p style="color: #444; line-height: 1.6;">
              Taking a moment to review and approve will help us get started on your project sooner!
            </p>
            <div style="margin: 32px 0;">
              <a href="${portalUrl}" 
                 style="background-color: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Review Your Kickoff Pack
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">
              If the button doesn't work, copy and paste this link:<br/>
              <a href="${portalUrl}" style="color: #6366f1;">${portalUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #aaa; font-size: 12px;">Sent by ${businessName} via KickoffClient</p>
          </div>
        `);
        // Log the reminder
        await supabase.from("reminder_logs").insert({
          submission_id: sub.id,
          workspace_id: template.workspace_id,
          client_name: sub.client_name,
          client_email: sub.client_email,
          reminder_type: "followup",
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send reminder to ${sub.client_email}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reminder error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
