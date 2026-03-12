import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMergedAnswers, getClientIdentity, normalizeSubmission, getCoreReport } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import UpgradeModal from "@/components/UpgradeModal";
import { Sparkles, Copy, Download, Loader2, RefreshCw, Zap, FileText, ExternalLink, Clock, CheckCircle, Lock as LockIcon, Save, Edit2, X, History, Bell, PenTool, Trash2, Mail, DollarSign } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";


function RiskBadge({ level }: { level: string }) {
  const variant = level === "High" ? "destructive" : level === "Medium" ? "secondary" : "outline";
  return <Badge variant={variant} className="text-xs">{level}</Badge>;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-primary" : score >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function formatBudget(value: any): string {
  if (!value && value !== 0) return "—";
  if (typeof value === "object" && value.currency && value.amount) {
    const num = parseFloat(value.amount);
    if (isNaN(num)) return `${value.currency} ${value.amount}`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: value.currency, minimumFractionDigits: 0 }).format(num);
  }
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
}

function formatTimeline(value: any): string {
  if (!value) return "—";
  if (typeof value === "object" && value.selection) {
    return value.note ? `${value.selection} — ${value.note}` : value.selection;
  }
  const str = String(value).trim();
  if (/\d+\s*(week|month|day|year)/i.test(str)) return str;
  const num = parseFloat(str);
  if (!isNaN(num)) return `${num} week${num !== 1 ? "s" : ""}`;
  return str;
}

function AnswerValue({ value, fieldType }: { value: any; fieldType: string }) {
  if (fieldType === "budget") return <span>{formatBudget(value)}</span>;
  if (fieldType === "timeline") return <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{formatTimeline(value)}</span>;
  if (fieldType === "file" && typeof value === "string" && value.startsWith("http")) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
        <ExternalLink className="h-3 w-3" /> View file
      </a>
    );
  }
  return <span>{String(value || "—")}</span>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", color: "bg-primary/10 text-primary border-primary/20" },
  needs_changes: { label: "Changes Requested", color: "bg-destructive/10 text-destructive border-destructive/20" },
  scope_locked: { label: "Scope Locked", color: "bg-primary/10 text-primary border-primary/20" },
  project_started: { label: "Project Started", color: "bg-primary/10 text-primary border-primary/20" },
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<any>(null);
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const { isPro } = useSubscription();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  // Proposal version state
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [contractSignature, setContractSignature] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const sendManualReminder = async () => {
    if (!submission || !workspace) return;
    const portalToken = (submission as any).portal_token;
    if (!portalToken) {
      toast({ title: "No portal link", description: "Generate a kickoff pack first.", variant: "destructive" });
      return;
    }
    setSendingReminder(true);
    const { name: identityName, email: identityEmail } = getClientIdentity(submission);
    try {
      const portalUrl = `${window.location.origin}/portal/${portalToken}`;
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "manual_reminder",
          submission_id: submission.id,
          app_url: window.location.origin,
        },
      });
      if (error) throw error;
      // Log the reminder
      await (supabase.from("reminder_logs" as any) as any).insert({
        submission_id: submission.id,
        workspace_id: workspace.id,
        client_name: identityName,
        client_email: identityEmail,
        reminder_type: "manual",
      });
      toast({ title: "Reminder sent!", description: `Email sent to ${identityEmail}` });
    } catch (e: any) {
      toast({ title: "Failed to send reminder", description: e.message || "Unknown error", variant: "destructive" });
    }
    setSendingReminder(false);
  };

  useEffect(() => {
    if (!id) return;
    supabase.from("submissions").select("*, templates(title)").eq("id", id).single().then(({ data }) => {
      setSubmission(data);
      if (data?.template_id) {
        supabase.from("template_fields").select("*").eq("template_id", data.template_id).order("position")
          .then(({ data: fields }) => setTemplateFields(fields || []));
      }
    });
    supabase.from("ai_reports").select("*").eq("submission_id", id).single().then(({ data }) => setReport(data));
    // fetch latest contract signature, ignoring 406 errors which may occur
    (async () => {
      try {
        const { data: sig, error } = await (supabase.from("contract_signatures" as any) as any)
          .select("*")
          .eq("submission_id", id)
          .order("signed_at", { ascending: false })
          .limit(1)
          .single();
        if (error && error.status !== 406) {
          console.error("signature query error", error);
        }
        if (sig) setContractSignature(sig);
      } catch (e) {
        console.error("signature fetch failed", e);
      }
    })();
    fetchVersions();
  }, [id]);

  const fetchVersions = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("proposal_versions" as any)
      .select("*")
      .eq("submission_id", id)
      .order("version_number", { ascending: false }) as any;
    setVersions(data || []);
  }, [id]);

  const generateReport = async (isRegenerate = false, mode = "standard") => {
    if (!submission) return;
    setGenerating(true);
    setGeneratingMode(mode === "standard" ? "core" : mode);

    const body: any = { submission_id: submission.id, mode, business_name: workspace?.business_name };
    if (isRegenerate && report) {
      body.regenerate = true;
      body.report_id = report.id;
    }

    const { data, error } = await supabase.functions.invoke("generate-kickoff-core", { body });
    setGenerating(false);
    setGeneratingMode(null);
    if (error) {
      toast({ title: "AI generation failed", description: String(error.message || error), variant: "destructive" });
    } else {
      // core endpoint returns { success:true, core_report_json: ..., maybe report }
      const coreData = data.core_report_json ? { ...data.report, core_report_json: data.core_report_json } : data.report;
      setReport(coreData);
      toast({ title: isRegenerate ? "Report regenerated!" : "Report generated!" });
      if (!isRegenerate && submission.portal_token) {
        supabase.functions.invoke("send-notification", {
          body: {
            type: "kickoff_ready",
            submission_id: submission.id,
            app_url: window.location.origin,
          },
        }).catch((e) => console.error("Notification send failed:", e));
      }
    }
  };

  const generateEmail = async () => {
    if (!submission?.id) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-kickoff-email", { body: { submission_id: submission.id } });
    setGenerating(false);
    if (error) return toast({ title: "Email generation failed", description: String(error.message), variant: "destructive" });
    toast({ title: "Email generated!" });
    // refresh report row
    const { data: refreshed } = await supabase.from("ai_reports").select("*").eq("submission_id", submission.id).single();
    if (refreshed) setReport(refreshed);
  };

  const generateProposal = async () => {
    if (!submission?.id) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-client-proposal", { body: { submission_id: submission.id } });
    setGenerating(false);
    if (error) return toast({ title: "Proposal generation failed", description: String(error.message), variant: "destructive" });
    toast({ title: "Proposal generated!" });
    const { data: refreshed } = await supabase.from("ai_reports").select("*").eq("submission_id", submission.id).single();
    if (refreshed) setReport(refreshed);
  };

  const generatePricing = async () => {
    if (!submission?.id) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-pricing-page", { body: { submission_id: submission.id } });
    setGenerating(false);
    if (error) return toast({ title: "Pricing page failed", description: String(error.message), variant: "destructive" });
    toast({ title: "Pricing page generated!" });
    const { data: refreshed } = await supabase.from("ai_reports").select("*").eq("submission_id", submission.id).single();
    if (refreshed) setReport(refreshed);
  };

  const saveSectionEdit = async (sectionKey: string, value: any) => {
    if (!report || !id) return;
    setSaving(true);

    const structured = getCoreReport(report);
    if (!structured) { setSaving(false); return; }

    const updatedData = { ...structured, [sectionKey]: value };
    const isApprovedStatus = ["approved", "scope_locked", "project_started"].includes(submission?.status);
    const nextVersion = (versions[0]?.version_number || 0) + 1;

    // Save version
    await (supabase.from("proposal_versions" as any) as any).insert({
      submission_id: id,
      version_number: nextVersion,
      content: updatedData,
      is_change_order: isApprovedStatus,
      created_by: user?.id || null,
    });

    // Update report summary
    await supabase.from("ai_reports").update({
      summary: JSON.stringify(updatedData),
    }).eq("id", report.id);

    const { data: updatedReport } = await supabase.from("ai_reports").select("*").eq("id", report.id).single();
    setReport(updatedReport);
    await fetchVersions();

    setSaving(false);
    toast({ title: isApprovedStatus ? `Change order saved (v${nextVersion})` : `Section saved (v${nextVersion})` });
  };



  const loadVersion = async (version: any) => {
    if (!report) return;
    await supabase.from("ai_reports").update({ summary: JSON.stringify(version.content) }).eq("id", report.id);
    const { data: updatedReport } = await supabase.from("ai_reports").select("*").eq("id", report.id).single();
    setReport(updatedReport);
    setShowVersions(false);
    toast({ title: `Loaded version ${version.version_number}` });
  };

  const copySection = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const exportPDF = () => {
    if (!isPro) { setUpgradeFeature("PDF Export"); setUpgradeOpen(true); return; }
    if (!report || !submission) return;
    const doc = new jsPDF();
    let y = 20;

    const businessName = workspace?.business_name || "KickoffClient";
    const brandColor = workspace?.brand_color || "#6366f1";

    // Helper: hex to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const bc = hexToRgb(brandColor);

    // Brand color header bar
    doc.setFillColor(bc.r, bc.g, bc.b);
    doc.rect(0, 0, 210, 12, "F");

    y = 24;

    // Logo placeholder (brand initial)
    doc.setFillColor(bc.r, bc.g, bc.b);
    doc.roundedRect(14, y - 4, 10, 10, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(businessName.charAt(0).toUpperCase(), 17, y + 3);
    doc.setTextColor(0, 0, 0);

    // Business name
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(businessName, 28, y + 3); y += 14;

    // Title
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.setTextColor(bc.r, bc.g, bc.b);
    doc.text("Kickoff Pack", 14, y); y += 10;
    doc.setTextColor(0, 0, 0);

    // Template & client
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text((submission as any).templates?.title || "", 14, y); y += 7;
    doc.setFontSize(10);
    const { name: pdfName, email: pdfEmail } = getClientIdentity(submission);
    doc.text(`Client: ${pdfName} — ${pdfEmail}`, 14, y); y += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}`, 14, y); y += 12;

    // Divider
    doc.setDrawColor(bc.r, bc.g, bc.b); doc.setLineWidth(0.5);
    doc.line(14, y, 196, y); y += 8;

    const addSection = (title: string, content: string) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.setTextColor(bc.r, bc.g, bc.b);
      doc.text(title, 14, y); y += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(content, 180); doc.text(lines, 14, y); y += lines.length * 5 + 10;
    };

    const structured = getCoreReport(report);
    if (structured) {
      addSection("Executive Summary", structured.executive_summary || "");
      if (structured.problem_diagnosis) addSection("Problem Diagnosis", structured.problem_diagnosis.description || "");
      if (structured.solution_blueprint) addSection("Solution Blueprint", typeof structured.solution_blueprint === "string" ? structured.solution_blueprint : JSON.stringify(structured.solution_blueprint, null, 2));
      addSection("Scope of Work", typeof structured.scope_doc === "string" ? structured.scope_doc : JSON.stringify(structured.scope_doc, null, 2));
      if (structured.timeline) addSection("Timeline", typeof structured.timeline === "string" ? structured.timeline : JSON.stringify(structured.timeline, null, 2));
      // kickoff_email is derived; fallback to legacy field
      addSection("Kickoff Email", structured.kickoff_email || report.kickoff_email || "");
    } else {
      addSection("Summary", report.summary || "");
      addSection("Kickoff Email", report.kickoff_email || "");
      addSection("Scope of Work", report.scope_doc || "");
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`${businessName} • Generated byClienticClientffIQ`, 14, 287);
      doc.text(`Page ${p} of ${pageCount}`, 180, 287);
    }

    // reuse pdfName from earlier destructure
    doc.save(`kickoff-pack-${pdfName}.pdf`);
  };

  const handleDeleteSubmission = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from("submissions").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Submission deleted" });
      navigate("/app/submissions");
    }
  };

  if (!submission) return <div className="text-muted-foreground">Loading…</div>;

  const portalToken = (submission as any).portal_token;
  const portalUrl = portalToken ? `${window.location.origin}/portal/${portalToken}` : "";
  const status = (submission as any).status || "pending";
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isApproved = ["approved", "scope_locked", "project_started"].includes(status);

  const structured = getCoreReport(report);
  const normalized = submission ? normalizeSubmission(submission, structured) : null;
  const mergedAnswers = normalized?.mergedAnswers || {};
  const clientName = normalized?.clientName || submission?.client_name;
  const clientEmail = normalized?.clientEmail || submission?.client_email;
  const followupQuestions = normalized?.followupQuestions || [];

  const labeledAnswers = templateFields.map((field) => {
    let value = mergedAnswers[field.id];
    const ll = field.label.toLowerCase();
    if (!value && (ll.includes("client name") || ll.includes("full name"))) value = clientName;
    if (!value && (ll.includes("client email") || ll.includes("email address") || ll === "client email")) value = clientEmail;
    return { label: field.label, value: value || "—", fieldType: field.field_type };
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{clientName}</h1>
          <p className="text-sm text-muted-foreground">{clientEmail} — {(submission as any).templates?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${statusInfo.color} px-3 py-1`}>{statusInfo.label}</Badge>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5 text-primary"><CheckCircle className="h-3 w-3" /> Submission Received</span>
            <span className={`flex items-center gap-1.5 ${report ? "text-primary" : "text-muted-foreground/40"}`}><CheckCircle className="h-3 w-3" /> Kickoff Pack Generated</span>
            <span className={`flex items-center gap-1.5 ${isApproved ? "text-primary" : "text-muted-foreground/40"}`}><CheckCircle className="h-3 w-3" /> Client Approved</span>
            <span className={`flex items-center gap-1.5 ${["scope_locked", "project_started"].includes(status) ? "text-primary" : "text-muted-foreground/40"}`}><LockIcon className="h-3 w-3" /> Scope Locked</span>
            <span className={`flex items-center gap-1.5 ${contractSignature ? "text-primary" : "text-muted-foreground/40"}`}><PenTool className="h-3 w-3" /> Contract Signed</span>
          </div>
        </CardContent>
      </Card>

      {/* Project Snapshot */}
      {structured && (
        <Card>
          <CardHeader><CardTitle className="text-base">Project Snapshot</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Client:</span> {clientName || "—"}</div>
              <div><span className="font-medium">Company:</span> {(submission as any).client_company || "—"}</div>
              <div><span className="font-medium">Goal:</span> {mergedAnswers["Project Goal"] || "—"}</div>
              <div><span className="font-medium">Budget:</span> {formatBudget(mergedAnswers["Project Budget"] || mergedAnswers["Budget Range"])}</div>
              <div><span className="font-medium">Timeline:</span> {formatTimeline(mergedAnswers["Project Timeline"] || mergedAnswers["Timeline"])}</div>
              <div><span className="font-medium">Recommended Package:</span> {structured.best_recommendation?.starting_package?.name || "—"}</div>
              <div><span className="font-medium">Risk Level:</span> {structured.kickoff_iq_score ? (structured.kickoff_iq_score.scope_risk_score >= 70 ? "High" : structured.kickoff_iq_score.scope_risk_score >= 40 ? "Medium" : "Low") : "—"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client change request */}
      {(submission as any).client_change_request && status === "needs_changes" && (
        <Card className="border-destructive/20">
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-destructive mb-1">Client Feedback</p>
            <p className="text-sm text-foreground">{(submission as any).client_change_request}</p>
          </CardContent>
        </Card>
      )}

      {/* Portal Link */}
      {portalUrl && (
        <Card>
          <CardContent className="flex items-center justify-between py-3 gap-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-foreground shrink-0">Client Portal:</span>
              <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs">{portalUrl}</a>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(portalUrl); toast({ title: "Portal link copied" }); }}><Copy className="h-3.5 w-3.5" /></Button>
              {status === "pending" && report && (
                <Button variant="ghost" size="sm" onClick={sendManualReminder} disabled={sendingReminder} className="text-primary">
                  {sendingReminder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Signature */}
      {contractSignature && (
        <Card className="border-primary/20">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Contract Signed</p>
            </div>
            <div className="flex items-center gap-4">
              <img src={contractSignature.signature_data} alt="Client signature" className="h-12 object-contain bg-white rounded border border-border p-1" />
              <div className="text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">{contractSignature.signer_name}</span> ({contractSignature.signer_email})</p>
                <p>{new Date(contractSignature.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Answers */}
      <Card>
        <CardHeader><CardTitle className="text-base">Client Answers</CardTitle></CardHeader>
        <CardContent>
          {labeledAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers recorded.</p>
          ) : (
            <div className="space-y-3">
              {labeledAnswers.map((a, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="col-span-2 text-muted-foreground"><AnswerValue value={a.value} fieldType={a.fieldType} /></span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Generate / Regenerate */}
      {!report ? (
        <Button onClick={() => generateReport(false)} disabled={generating} className="w-full">
          {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Kickoff Report</>}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirmRegenerate(true)} disabled={generating} className="flex-1">
              {generating && generatingMode === "core" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating…</> : <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate</>}
            </Button>
            <Button variant="outline" size="sm" disabled={generating} onClick={() => generateReport(true, "detailed")}>
              {generating && generatingMode === "detailed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" /> Detailed</>}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" size="sm" onClick={generateEmail} disabled={generating || !report}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Generate Email
            </Button>
            <Button variant="ghost" size="sm" onClick={generateProposal} disabled={generating || !report}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Generate Proposal
            </Button>
            <Button variant="ghost" size="sm" onClick={generatePricing} disabled={generating || !report}>
              <DollarSign className="h-3.5 w-3.5 mr-1" /> Generate Pricing
            </Button>
          </div>
          <div className="flex gap-3">
            {versions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { if (!isPro) { setUpgradeFeature("Version History"); setUpgradeOpen(true); return; } setShowVersions(true); }}>
                <History className="h-3.5 w-3.5 mr-1" /> v{versions[0]?.version_number || 1} ({versions.length} version{versions.length !== 1 ? "s" : ""})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Regenerate confirmation */}
      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Kickoff Report?</AlertDialogTitle>
            <AlertDialogDescription>This will overwrite the current core report with a new AI-generated one.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRegenerate(false); generateReport(true); }}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the submission from <strong>{submission?.client_name}</strong>, including its kickoff pack, contract signature, and all related data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubmission} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposal Versions</DialogTitle>
            <DialogDescription>Click a version to load it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {versions.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/40 cursor-pointer transition-colors"
                onClick={() => loadVersion(v)}
              >
                <div>
                  <span className="text-sm font-medium text-foreground">Version {v.version_number}</span>
                  {v.is_change_order && <Badge variant="secondary" className="ml-2 text-[10px]">Change Order</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersions(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {report && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="h-3.5 w-3.5 mr-1" /> {isPro ? "Export PDF" : "Export PDF (Pro)"}
            </Button>
          </div>

          {structured ? (
            <StructuredReport
              data={structured}
              onCopy={copySection}
              editing={false}
              editData={null}
              setEditData={() => {}}
              onSaveSection={saveSectionEdit}
              isPro={isPro}
              onUpgrade={() => { setUpgradeFeature("Editable Proposals"); setUpgradeOpen(true); }}
              followupQuestions={followupQuestions}
              submission={submission}
            />
          ) : (
            <LegacyReport report={report} onCopy={copySection} />
          )}
        </>
      )}


      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </div>
  );
}

// Helper to serialize any section value to editable text
function sectionToText(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(v => typeof v === "string" ? v : JSON.stringify(v, null, 2)).join("\n");
  return JSON.stringify(val, null, 2);
}

// Helper to parse edited text back to structured data
function textToSection(text: string, original: any): any {
  if (!text) return original;
  if (typeof original === "string") return text;
  if (Array.isArray(original)) {
    const lines = text.split("\n").map(l => l.replace(/^[•\-\s]+/, "").trim()).filter(Boolean);
    if (original.length > 0 && typeof original[0] === "object") {
      try { return lines.map(l => JSON.parse(l)); } catch { return lines; }
    }
    return lines;
  }
  try { return JSON.parse(text); } catch { return text; }
}

// Per-section editable card
function EditableSectionCard({
  title,
  sectionKey,
  data,
  editingSections,
  onToggleEdit,
  onSave,
  onCopy,
  children,
  editContent,
}: {
  title: string;
  sectionKey: string;
  data: any;
  editingSections: Record<string, string>;
  onToggleEdit: (key: string, value: any) => void;
  onSave: (key: string) => void;
  onCopy: () => void;
  children: React.ReactNode;
  editContent?: React.ReactNode;
}) {
  const isEditing = sectionKey in editingSections;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => onToggleEdit(sectionKey, data)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              <Button variant="default" size="sm" onClick={() => onSave(sectionKey)}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onToggleEdit(sectionKey, undefined)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (editContent || (
          <Textarea
            value={editingSections[sectionKey]}
            onChange={(e) => onToggleEdit(sectionKey, e.target.value)}
            className="text-sm min-h-[120px] font-mono"
          />
        )) : children}
      </CardContent>
    </Card>
  );
}

function StructuredReport({
  data,
  onCopy,
  editing: _globalEditing,
  editData: _editData,
  setEditData: _setEditData,
  onSaveSection,
  isPro,
  onUpgrade,
  followupQuestions,
  submission,
}: {
  data: any;
  onCopy: (t: string) => void;
  editing: boolean;
  editData: any;
  setEditData: (d: any) => void;
  onSaveSection?: (sectionKey: string, value: any) => void;
  isPro?: boolean;
  onUpgrade?: () => void;
  followupQuestions?: string[];
  submission?: any;
}) {
  // Per-section editing state: { [sectionKey]: editableTextValue }
  const [editingSections, setEditingSections] = useState<Record<string, string>>({});

  const toggleEdit = (key: string, value: any) => {
    if (value === undefined) {
      // Cancel
      setEditingSections(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else if (key in editingSections) {
      // Update text
      setEditingSections(prev => ({ ...prev, [key]: typeof value === "string" ? value : sectionToText(value) }));
    } else {
      // Start editing
      if (!isPro) { onUpgrade?.(); return; }
      setEditingSections(prev => ({ ...prev, [key]: sectionToText(value) }));
    }
  };

  const saveSection = (key: string) => {
    const text = editingSections[key];
    const original = getOriginalValue(key);
    const parsed = textToSection(text, original);
    onSaveSection?.(key, parsed);
    setEditingSections(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const getOriginalValue = (key: string): any => {
    const keyParts = key.split(".");
    let val: any = data;
    for (const k of keyParts) val = val?.[k];
    return val;
  };

  const d = data;

  return (
    <div className="space-y-4">
      {/* Confirmed Facts / Assumptions / Needs Clarification */}
      {(d.confirmed_facts || d.assumptions || d.needs_clarification) && (
        <div className="grid gap-4 md:grid-cols-3">
          {d.confirmed_facts && (
            <EditableSectionCard title="Confirmed Facts" sectionKey="confirmed_facts" data={d.confirmed_facts} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.confirmed_facts.join("\n"))}>
              <ul className="text-xs text-foreground space-y-1">{d.confirmed_facts.map((f: string, i: number) => <li key={i}>• {f}</li>)}</ul>
            </EditableSectionCard>
          )}
          {d.assumptions && (
            <EditableSectionCard title="Assumptions" sectionKey="assumptions" data={d.assumptions} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.assumptions.join("\n"))}>
              <ul className="text-xs text-foreground space-y-1">{d.assumptions.map((a: string, i: number) => <li key={i}>• {a}</li>)}</ul>
            </EditableSectionCard>
          )}
          {d.needs_clarification && (
            <EditableSectionCard title="Needs Clarification" sectionKey="needs_clarification" data={d.needs_clarification} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.needs_clarification.join("\n"))}>
              <ul className="text-xs text-foreground space-y-1">{d.needs_clarification.map((q: string, i: number) => <li key={i}>• {q}</li>)}</ul>
            </EditableSectionCard>
          )}
        </div>
      )}

      {d.executive_summary && (
        <EditableSectionCard title="Executive Summary" sectionKey="executive_summary" data={d.executive_summary} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.executive_summary || "")}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.executive_summary}</p>
        </EditableSectionCard>
      )}

      {d.problem_diagnosis && (
        <EditableSectionCard title="Problem Diagnosis" sectionKey="problem_diagnosis" data={d.problem_diagnosis} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.problem_diagnosis, null, 2))}>
          <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{d.problem_diagnosis.description}</p>
          <p className="text-xs font-medium text-muted-foreground mb-1">Root Causes</p>
          <ul className="text-sm text-foreground space-y-1 mb-3">{d.problem_diagnosis.root_causes?.map((c: string, i: number) => <li key={i}>• {c}</li>)}</ul>
          <p className="text-xs font-medium text-muted-foreground mb-1">Implications</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.problem_diagnosis.implications}</p>
        </EditableSectionCard>
      )}

      {d.solution_blueprint && (
        <EditableSectionCard title="Solution Blueprint" sectionKey="solution_blueprint" data={d.solution_blueprint} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.solution_blueprint, null, 2))}>
          {d.solution_blueprint.phases?.map((p: any, i: number) => (
            <div key={i} className="mb-3">
              <p className="text-sm font-medium text-foreground">{p.name} <span className="text-muted-foreground font-normal">({p.duration})</span></p>
              <ul className="text-sm text-muted-foreground ml-3">{p.deliverables?.map((dd: string, j: number) => <li key={j}>• {dd}</li>)}</ul>
            </div>
          ))}
          {d.solution_blueprint.assumptions?.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">Assumptions</p>
              <ul className="text-sm text-foreground space-y-1">{d.solution_blueprint.assumptions.map((a: string, i: number) => <li key={i}>• {a}</li>)}</ul>
            </>
          )}
        </EditableSectionCard>
      )}

      {d.scope_doc && typeof d.scope_doc === "object" && (
        <EditableSectionCard title="Scope of Work" sectionKey="scope_doc" data={d.scope_doc} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.scope_doc, null, 2))}>
          <p className="text-xs font-medium text-muted-foreground mb-1">In Scope</p>
          <ul className="text-sm text-foreground space-y-1 mb-3">{d.scope_doc.in_scope?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
          <p className="text-xs font-medium text-muted-foreground mb-1">Out of Scope</p>
          <ul className="text-sm text-foreground space-y-1 mb-3">{d.scope_doc.out_of_scope?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
          <p className="text-xs font-medium text-muted-foreground mb-1">Acceptance Criteria</p>
          <ul className="text-sm text-foreground space-y-1">{d.scope_doc.acceptance_criteria?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
        </EditableSectionCard>
      )}

      {d.suggested_budget && (
        <EditableSectionCard title="Budget Analysis" sectionKey="suggested_budget" data={d.suggested_budget} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.suggested_budget, null, 2))}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.suggested_budget.analysis}</p>
          {d.suggested_budget.what_is_possible && (
            <div className="mt-3 rounded-md bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-medium text-primary mb-1">✅ What's possible at this budget</p>
              <p className="text-sm text-foreground">{d.suggested_budget.what_is_possible}</p>
            </div>
          )}
          {d.suggested_budget.what_is_not_possible && (
            <div className="mt-2 rounded-md bg-destructive/5 border border-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive mb-1">❌ What's not realistic at this budget</p>
              <p className="text-sm text-foreground">{d.suggested_budget.what_is_not_possible}</p>
            </div>
          )}
          <div className="grid gap-2 mt-3">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">Minimum Viable</p>
              <p className="text-sm text-foreground">{d.suggested_budget.minimum_viable}</p>
            </div>
            <div className="rounded-md bg-accent p-3 border border-primary/20">
              <p className="text-xs font-medium text-accent-foreground">Recommended</p>
              <p className="text-sm text-foreground">{d.suggested_budget.recommended}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">Premium</p>
              <p className="text-sm text-foreground">{d.suggested_budget.premium}</p>
            </div>
          </div>
          {d.suggested_budget.strategic_allocation && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Strategic Allocation</p>
              <p className="text-sm text-foreground">{d.suggested_budget.strategic_allocation}</p>
            </div>
          )}
        </EditableSectionCard>
      )}

      {d.suggested_timeline && (
        <EditableSectionCard title="Timeline Analysis" sectionKey="suggested_timeline" data={d.suggested_timeline} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.suggested_timeline, null, 2))}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.suggested_timeline.analysis}</p>
          {d.suggested_timeline.what_is_possible && (
            <div className="mt-3 rounded-md bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-medium text-primary mb-1">✅ What's possible in this timeline</p>
              <p className="text-sm text-foreground">{d.suggested_timeline.what_is_possible}</p>
            </div>
          )}
          {d.suggested_timeline.what_should_be_deferred && (
            <div className="mt-2 rounded-md bg-warning/5 border border-warning/10 p-3">
              <p className="text-xs font-medium text-warning mb-1">⏳ Should be deferred</p>
              <p className="text-sm text-foreground">{d.suggested_timeline.what_should_be_deferred}</p>
            </div>
          )}
          {d.suggested_timeline.realistic_timeline && (
            <div className="mt-2 rounded-md bg-accent p-3 border border-primary/20">
              <p className="text-xs font-medium text-accent-foreground">Realistic Timeline</p>
              <p className="text-sm text-foreground">{d.suggested_timeline.realistic_timeline}</p>
            </div>
          )}
          <div className="grid gap-2 mt-3">
            {d.suggested_timeline.fast_track && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Fast Track — {d.suggested_timeline.fast_track.duration}</p>
                <p className="text-sm text-foreground">{d.suggested_timeline.fast_track.tradeoffs}</p>
              </div>
            )}
            {d.suggested_timeline.standard && (
              <div className="rounded-md bg-accent p-3 border border-primary/20">
                <p className="text-xs font-medium text-accent-foreground">Standard — {d.suggested_timeline.standard.duration}</p>
                <p className="text-sm text-foreground">{d.suggested_timeline.standard.description}</p>
              </div>
            )}
            {d.suggested_timeline.comfortable && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Comfortable — {d.suggested_timeline.comfortable.duration}</p>
                <p className="text-sm text-foreground">{d.suggested_timeline.comfortable.description}</p>
              </div>
            )}
          </div>
          {d.suggested_timeline.key_dependencies?.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mt-3 mb-1">Key Dependencies</p>
              <ul className="text-sm text-foreground space-y-1">{d.suggested_timeline.key_dependencies.map((dep: string, i: number) => <li key={i}>• {dep}</li>)}</ul>
            </>
          )}
        </EditableSectionCard>
      )}

      {/* Best Recommendation */}
      {d.best_recommendation && (
        <EditableSectionCard title="Best Recommendation" sectionKey="best_recommendation" data={d.best_recommendation} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.best_recommendation, null, 2))}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{d.best_recommendation.approach}</p>
          <div className="rounded-md bg-background p-3 border border-border mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Why this is the best first move</p>
            <p className="text-sm text-foreground">{d.best_recommendation.why}</p>
          </div>
          {d.best_recommendation.starting_package && (
            <div className="rounded-md bg-accent p-3 border border-primary/20 mt-2">
              <p className="text-xs font-medium text-accent-foreground mb-1">Recommended Starting Package: {d.best_recommendation.starting_package.name}</p>
              <p className="text-sm text-foreground">{d.best_recommendation.starting_package.scope_summary}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>💰 {d.best_recommendation.starting_package.estimated_budget}</span>
                <span>⏱ {d.best_recommendation.starting_package.estimated_timeline}</span>
              </div>
            </div>
          )}
        </EditableSectionCard>
      )}

      {/* MVP Adjustment */}
      {d.mvp_adjustment && d.mvp_adjustment.recommended && (
        <EditableSectionCard title="MVP Adjustment" sectionKey="mvp_adjustment" data={d.mvp_adjustment} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.mvp_adjustment, null, 2))}>
          <p className="text-sm text-foreground mb-3">{d.mvp_adjustment.rationale}</p>
          <div className="grid gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">MVP Scope</p>
              <ul className="text-sm text-foreground space-y-1">{d.mvp_adjustment.reduced_scope?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Deferred to Phase 2</p>
              <ul className="text-sm text-foreground space-y-1">{d.mvp_adjustment.deferred_features?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </div>
            <div className="flex gap-4">
              {d.mvp_adjustment.mvp_budget && <div className="rounded-md bg-muted p-3 flex-1"><p className="text-xs font-medium text-muted-foreground">MVP Budget</p><p className="text-sm text-foreground">{d.mvp_adjustment.mvp_budget}</p></div>}
              {d.mvp_adjustment.mvp_timeline && <div className="rounded-md bg-muted p-3 flex-1"><p className="text-xs font-medium text-muted-foreground">MVP Timeline</p><p className="text-sm text-foreground">{d.mvp_adjustment.mvp_timeline}</p></div>}
            </div>
          </div>
        </EditableSectionCard>
      )}

      {d.timeline && typeof d.timeline === "object" && (
        <EditableSectionCard title="Timeline" sectionKey="timeline" data={d.timeline} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.timeline, null, 2))}>
          <p className="text-sm text-foreground font-medium mb-2">{d.timeline.overview}</p>
          {d.timeline.breakdown?.map((b: any, i: number) => (
            <div key={i} className="mb-2 text-sm"><span className="font-medium text-foreground">{b.period}:</span> <span className="text-muted-foreground">{b.activities}</span></div>
          ))}
          {d.timeline.delay_risks && (<><p className="text-xs font-medium text-muted-foreground mt-2 mb-1">Delay Risks</p><p className="text-sm text-foreground">{d.timeline.delay_risks}</p></>)}
        </EditableSectionCard>
      )}

      {d.milestones && Array.isArray(d.milestones) && (
        <EditableSectionCard title="Milestones" sectionKey="milestones" data={d.milestones} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.milestones, null, 2))}>
          {d.milestones.map((m: any, i: number) => (
            <div key={i} className="mb-2 text-sm">
              <p className="font-medium text-foreground">{typeof m === "string" ? m : m.name}</p>
              {typeof m === "object" && <p className="text-muted-foreground text-xs">Output: {m.output} · Sign-off: {m.signoff}</p>}
            </div>
          ))}
        </EditableSectionCard>
      )}

      {d.risks && Array.isArray(d.risks) && (
        <EditableSectionCard title="Risks & Mitigation" sectionKey="risks" data={d.risks} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.risks, null, 2))}>
          {d.risks.map((r: any, i: number) => (
            <div key={i} className="mb-3 text-sm">
              {typeof r === "string" ? <p className="text-foreground">• {r}</p> : (
                <>
                  <div className="flex items-center gap-2 mb-1"><span className="font-medium text-foreground">{r.risk}</span><RiskBadge level={r.severity || "Medium"} /></div>
                  <p className="text-muted-foreground text-xs">Likelihood: {r.likelihood} · Mitigation: {r.mitigation}</p>
                </>
              )}
            </div>
          ))}
        </EditableSectionCard>
      )}

      {d.negotiation_script && Array.isArray(d.negotiation_script) && d.negotiation_script.length > 0 && (
        <EditableSectionCard title="Negotiation Script" sectionKey="negotiation_script" data={d.negotiation_script} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.negotiation_script.join("\n"))}>
          <ul className="text-sm text-foreground space-y-2">
            {d.negotiation_script.map((phrase: string, i: number) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary font-medium shrink-0">💬</span><span className="italic">{phrase}</span></li>
            ))}
          </ul>
        </EditableSectionCard>
      )}


      <EditableSectionCard title="Kickoff Email" sectionKey="kickoff_email" data={d.kickoff_email} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(d.kickoff_email || "")}>
        <p className="text-sm text-foreground whitespace-pre-wrap">{d.kickoff_email || "—"}</p>
      </EditableSectionCard>

      {d.kickoff_iq_score && (
        <EditableSectionCard title="KickoffClient Score" sectionKey="kickoff_iq_score" data={d.kickoff_iq_score} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.kickoff_iq_score, null, 2))}>
          <div className="space-y-4">
            <div className="grid gap-3">
              <ScoreBar score={d.kickoff_iq_score.clarity_score} label="Clarity" />
              <ScoreBar score={d.kickoff_iq_score.scope_risk_score} label="Scope Risk" />
              <ScoreBar score={d.kickoff_iq_score.budget_realism_score} label="Budget Realism" />
              <ScoreBar score={d.kickoff_iq_score.timeline_realism_score} label="Timeline Realism" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs font-medium text-destructive mb-1">Red Flags</p>
                <ul className="text-xs text-muted-foreground space-y-1">{d.kickoff_iq_score.red_flags?.map((f: string, i: number) => <li key={i}>⚠ {f}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-medium text-primary mb-1">Next Actions</p>
                <ul className="text-xs text-muted-foreground space-y-1">{d.kickoff_iq_score.next_best_actions?.map((a: string, i: number) => <li key={i}>→ {a}</li>)}</ul>
              </div>
            </div>
            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <p>{d.kickoff_iq_score.clarity_explanation}</p>
              <p>{d.kickoff_iq_score.scope_risk_explanation}</p>
              <p>{d.kickoff_iq_score.budget_realism_explanation}</p>
              <p>{d.kickoff_iq_score.timeline_realism_explanation}</p>
            </div>
          </div>
        </EditableSectionCard>
      )}

      {/* insertion: show follow-up info from the AI report and submission before next step */}
      {d.missing_info && (
        <EditableSectionCard title="Follow-up Questions" sectionKey="missing_info" data={d.missing_info} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.missing_info, null, 2))}>
          {typeof d.missing_info === "object" && !Array.isArray(d.missing_info) ? (
            Object.entries(d.missing_info).map(([category, questions]: [string, any]) => (
              <div key={category} className="mb-3">
                <p className="text-xs font-medium text-muted-foreground capitalize mb-1">{category.replace(/_/g, " ")}</p>
                <ul className="text-sm text-foreground space-y-1">{(Array.isArray(questions) ? questions : []).map((q: string, i: number) => <li key={i}>• {q}</li>)}</ul>
              </div>
            ))
          ) : (
            <ul className="text-sm text-foreground space-y-1">{(Array.isArray(d.missing_info) ? d.missing_info : []).map((q: string, i: number) => <li key={i}>• {q}</li>)}</ul>
          )}
        </EditableSectionCard>
      )}

      {followupQuestions && followupQuestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Follow‑up Answers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {followupQuestions.map((q, i) => {
                const key = `q_${i}`;
                const ans = submission?.followup_answers?.[key] || "";
                return (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-muted/5 border border-border"
                  >
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {q}
                    </p>
                    {ans ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        <AnswerValue value={ans} fieldType="text" />
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No answer provided
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {d.next_step_recommendation && (
        <EditableSectionCard title="Next Step" sectionKey="next_step_recommendation" data={d.next_step_recommendation} editingSections={editingSections} onToggleEdit={toggleEdit} onSave={saveSection} onCopy={() => onCopy(JSON.stringify(d.next_step_recommendation, null, 2))}>
          <p className="text-sm text-foreground">{typeof d.next_step_recommendation === "string" ? d.next_step_recommendation : d.next_step_recommendation.summary}</p>
        </EditableSectionCard>
      )}
    </div>
  );
}

function LegacyReport({ report, onCopy }: { report: any; onCopy: (t: string) => void }) {
  const sections = [
    { title: "Summary", content: report.summary },
    { title: "Missing Info", content: Array.isArray(report.missing_info) ? report.missing_info.map((s: string) => `• ${s}`).join("\n") : "" },
    { title: "Risks", content: Array.isArray(report.risks) ? report.risks.map((s: string) => `• ${s}`).join("\n") : "" },
    { title: "Timeline", content: report.timeline },
    { title: "Milestones", content: Array.isArray(report.milestones) ? report.milestones.map((s: string) => `• ${s}`).join("\n") : "" },
    { title: "Kickoff Email", content: report.kickoff_email },
    { title: "Scope of Work", content: report.scope_doc },
  ];
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{s.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onCopy(s.content || "")}><Copy className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{s.content || "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
