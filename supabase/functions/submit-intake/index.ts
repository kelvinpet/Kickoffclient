import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { public_id, client_name, client_email, answers, files } = await req.json();

    if (!public_id || !client_name?.trim() || !client_email?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate template exists and is active
    const { data: template, error: tErr } = await supabase
      .from("templates")
      .select("id, workspace_id, status")
      .eq("public_id", public_id)
      .single();

    if (tErr || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (template.status !== "active") {
      return new Response(
        JSON.stringify({ error: "This form is no longer accepting submissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check submission limit
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("plan, monthly_submission_limit")
      .eq("id", template.workspace_id)
      .single();

    if (workspace && workspace.plan !== "pro") {
      const { count } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("template_id", template.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if ((count ?? 0) >= workspace.monthly_submission_limit) {
        return new Response(
          JSON.stringify({ error: "Monthly submission limit reached. Please contact the provider." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Merge identity fields into answers for display consistency
    const mergedAnswers = {
      ...(answers || {}),
      client_full_name: client_name.trim(),
      client_email: client_email.trim(),
    };

    // Insert submission
    const { data: submission, error: insertErr } = await supabase
      .from("submissions")
      .insert({
        template_id: template.id,
        client_name: client_name.trim(),
        client_email: client_email.trim(),
        answers: mergedAnswers,
        files: files || [],
        status: "pending",
      })
      .select("portal_token")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, portal_token: submission.portal_token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
