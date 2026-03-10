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
      from: "KickoffClientdev>",
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

function kickoffReadyEmail(clientName: string, businessName: string, portalUrl: string) {
  return {
    subject: `${businessName} — Your Project Kickoff Pack is Ready`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">Hi ${clientName},</h2>
        <p style="color: #444; line-height: 1.6;">
          Great news! <strong>${businessName}</strong> has prepared your project kickoff pack. 
          It includes a detailed scope summary, milestones, timeline, and more.
        </p>
        <p style="color: #444; line-height: 1.6;">
          Please review the pack and let us know if everything looks good or if you'd like any changes.
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
      </div>`,
  };
}

function ownerNotificationEmail(ownerName: string, clientName: string, clientEmail: string, status: string, submissionUrl: string) {
  const statusLabel = status === "approved" ? "approved the proposal" : "requested changes";
  return {
    subject: `Client Update: ${clientName} ${statusLabel}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">Hi ${ownerName || "there"},</h2>
        <p style="color: #444; line-height: 1.6;">
          <strong>${clientName}</strong> (${clientEmail}) has <strong>${statusLabel}</strong>.
        </p>
        <div style="margin: 32px 0;">
          <a href="${submissionUrl}" 
             style="background-color: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            View Submission
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px;">KickoffClient Notification</p>
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, submission_id, portal_url, app_url, status: reqStatus } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (type === "kickoff_ready") {
      // Get submission + workspace info
      const { data: sub } = await supabase
        .from("submissions")
        .select("client_name, client_email, portal_token, template_id")
        .eq("id", submission_id)
        .single();
      if (!sub) throw new Error("Submission not found");

      const { data: template } = await supabase
        .from("templates")
        .select("workspace_id")
        .eq("id", sub.template_id)
        .single();

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("business_name")
        .eq("id", template!.workspace_id)
        .single();

      const businessName = workspace?.business_name || "Your Service Provider";
      const portalLink = portal_url || `${app_url || "https://kickoffclient.lovable.app"}/portal/${sub.portal_token}`;

      const email = kickoffReadyEmail(sub.client_name, businessName, portalLink);
      await sendEmail(sub.client_email, email.subject, email.html);

      return new Response(JSON.stringify({ success: true, sent_to: sub.client_email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "client_status_update") {
      // Notify the workspace owner when a client approves or requests changes
      
      const { data: sub } = await supabase
        .from("submissions")
        .select("client_name, client_email, status, template_id")
        .eq("id", submission_id)
        .single();
      if (!sub) throw new Error("Submission not found");

      const { data: template } = await supabase
        .from("templates")
        .select("workspace_id")
        .eq("id", sub.template_id)
        .single();

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", template!.workspace_id)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", workspace!.owner_user_id)
        .single();

      if (!profile?.email) throw new Error("Owner email not found");

      const submissionLink = `${app_url || "https://kickoffclient.lovable.app"}/app/submissions/${submission_id}`;
      const email = ownerNotificationEmail(
        profile.name,
        sub.client_name,
        sub.client_email,
        reqStatus || sub.status,
        submissionLink
      );
      await sendEmail(profile.email, email.subject, email.html);

      return new Response(JSON.stringify({ success: true, sent_to: profile.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "manual_reminder") {
      const { data: sub } = await supabase
        .from("submissions")
        .select("client_name, client_email, portal_token, template_id")
        .eq("id", submission_id)
        .single();
      if (!sub) throw new Error("Submission not found");

      const { data: template } = await supabase
        .from("templates")
        .select("workspace_id")
        .eq("id", sub.template_id)
        .single();

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("business_name")
        .eq("id", template!.workspace_id)
        .single();

      const businessName = workspace?.business_name || "Your Service Provider";
      const portalLink = `${app_url || "https://kickoffclient.lovable.app"}/portal/${sub.portal_token}`;

      const subject = `${businessName} — Reminder: Your Kickoff Pack Awaits`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #111; margin-bottom: 8px;">Hi ${sub.client_name},</h2>
          <p style="color: #444; line-height: 1.6;">
            Just a friendly reminder — <strong>${businessName}</strong> prepared your project kickoff pack and it's waiting for your review.
          </p>
          <p style="color: #444; line-height: 1.6;">
            Taking a moment to review and approve will help get your project started sooner!
          </p>
          <div style="margin: 32px 0;">
            <a href="${portalLink}" 
               style="background-color: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Review Your Kickoff Pack
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${portalLink}" style="color: #6366f1;">${portalLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #aaa; font-size: 12px;">Sent by ${businessName} via KickoffClient</p>
        </div>
      `;

      await sendEmail(sub.client_email, subject, html);

      return new Response(JSON.stringify({ success: true, sent_to: sub.client_email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown notification type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
