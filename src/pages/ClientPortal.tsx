import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSubmission, getCoreReport } from "@/lib/utils";
import SignaturePad from "@/components/SignaturePad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Zap, CheckCircle, Clock, AlertCircle, FileText, ExternalLink, ChevronRight, Download, Lock as LockIcon, Loader2, Check, ThumbsUp, ThumbsDown, PenTool } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";


function formatBudgetValue(value: any): string {
  if (!value) return "—";
  if (typeof value === "object" && value.currency && value.amount) {
    const num = parseFloat(value.amount);
    if (isNaN(num)) return `${value.currency} ${value.amount}`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: value.currency, minimumFractionDigits: 0 }).format(num);
  }
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
}

function formatTimelineValue(value: any): string {
  if (!value) return "—";
  if (typeof value === "object" && value.selection) {
    return value.note ? `${value.selection} — ${value.note}` : value.selection;
  }
  return String(value);
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending Review", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
  needs_changes: { label: "Changes Requested", icon: AlertCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  scope_locked: { label: "Scope Locked", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
  project_started: { label: "Project Started", icon: Check, color: "bg-primary/10 text-primary border-primary/20" },
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "scope", label: "Scope" },
  { id: "timeline", label: "Timeline" },
  { id: "budget", label: "Budget" },
  { id: "risks", label: "Risks" },
  { id: "followup", label: "Questions" },
];

const REVIEWABLE_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "scope_of_work", label: "Scope of Work" },
  { key: "timeline", label: "Timeline" },
  { key: "budget", label: "Budget" },
  { key: "risks", label: "Risks" },
];

function SectionDivider({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-20">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
        <ChevronRight className="h-4 w-4 text-primary" />
        {title}
      </h2>
      <div className="h-px bg-border" />
    </div>
  );
}

function SectionReview({
  sectionKey,
  sectionLabel,
  feedback,
  onApprove,
  onRequestChange,
  isApproved: portalApproved,
}: {
  sectionKey: string;
  sectionLabel: string;
  feedback: Record<string, any>;
  onApprove: (key: string) => void;
  onRequestChange: (key: string, comment: string) => void;
  isApproved: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const [changeComment, setChangeComment] = useState("");
  const sectionFeedback = feedback[sectionKey];
  const sectionStatus = sectionFeedback?.status; // 'approved' | 'changes_requested'

  if (portalApproved) {
    return sectionStatus === "approved" ? (
      <div className="flex items-center gap-1.5 text-xs text-primary mt-2">
        <CheckCircle className="h-3 w-3" /> Section approved
      </div>
    ) : sectionStatus === "changes_requested" ? (
      <div className="mt-2 rounded-md bg-destructive/5 border border-destructive/10 p-2">
        <p className="text-xs text-destructive font-medium">Changes requested</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sectionFeedback?.comment}</p>
      </div>
    ) : null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {sectionStatus === "approved" ? (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <CheckCircle className="h-3 w-3" /> You approved this section
        </div>
      ) : sectionStatus === "changes_requested" ? (
        <div className="rounded-md bg-destructive/5 border border-destructive/10 p-2">
          <p className="text-xs text-destructive font-medium">You requested changes</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sectionFeedback?.comment}</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onApprove(sectionKey)}>
              <ThumbsUp className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowInput(!showInput)}>
              <ThumbsDown className="h-3 w-3 mr-1" /> Request Changes
            </Button>
          </div>
          {showInput && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder={`What would you like changed in ${sectionLabel}?`}
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <Button
                size="sm"
                className="text-xs h-7"
                disabled={!changeComment.trim()}
                onClick={() => {
                  onRequestChange(sectionKey, changeComment);
                  setChangeComment("");
                  setShowInput(false);
                }}
              >
                Submit Feedback
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function generateContractPDF(submission: any, templateTitle: string, structured: any, workspace?: any) {
  const doc = new jsPDF();
  let y = 20;
  const businessName = workspace?.business_name || "KickoffClient";
  const { name: pdfClientName, email: pdfClientEmail } = getClientIdentity(submission);
  const addText = (text: string, fontSize = 10, bold = false) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 20, y);
    y += lines.length * (fontSize * 0.5) + 4;
  };

  addText(businessName.toUpperCase(), 16, true); y += 2;
  addText("SERVICE AGREEMENT", 20, true); y += 4;
  addText(`Project: ${templateTitle}`, 12, true); y += 2;
  addText(`Client: ${pdfClientName}`, 11);
  addText(`Email: ${pdfClientEmail}`, 11);
  addText(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 11);
  y += 6;

  addText("PROJECT SCOPE", 14, true);
  if (structured?.scope_doc?.in_scope) {
    structured.scope_doc.in_scope.forEach((s: string) => addText(`• ${s}`));
  } else { addText("As outlined in the approved kickoff pack."); }
  y += 4;

  addText("DELIVERABLES", 14, true);
  if (structured?.solution_blueprint?.phases) {
    structured.solution_blueprint.phases.forEach((p: any) => {
      addText(`${p.name} (${p.duration})`, 10, true);
      p.deliverables?.forEach((d: string) => addText(`  • ${d}`));
    });
  } else if (structured?.milestones) {
    (Array.isArray(structured.milestones) ? structured.milestones : []).forEach((m: any) => addText(`• ${typeof m === "string" ? m : m.name}`));
  } else { addText("As outlined in the approved kickoff pack."); }
  y += 4;

  addText("TIMELINE", 14, true);
  if (structured?.timeline?.overview) addText(structured.timeline.overview);
  else addText("As outlined in the approved kickoff pack.");
  y += 4;

  addText("PAYMENT TERMS", 14, true);
  addText("Payment terms as agreed between client and service provider.");
  y += 4;

  addText("ACCEPTANCE", 14, true);
  addText("By approving this document, the client agrees to the scope, deliverables, and timeline outlined above. Any changes to scope after approval may require a revised agreement and additional fees.");
  y += 8;
  addText("________________________________", 10);
  addText(`${submission.client_name}`, 10, true);
  if (submission.approved_at) addText(`Approved: ${new Date(submission.approved_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 9);

  doc.save(`contract-${submission.client_name}.pdf`);
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [updating, setUpdating] = useState(false);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveChecked, setApproveChecked] = useState(false);
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, any>>({});
  const [followupAnswers, setFollowupAnswers] = useState<Record<string, string>>({});
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [signature, setSignature] = useState<any>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc("get_submission_by_portal_token", { p_token: token } as any)
      .then(({ data: result, error }: any) => {
        if (error || !result) setNotFound(true);
        else {
          setData(result);
          setSectionFeedback(result.submission?.section_feedback || {});
          setFollowupAnswers(result.submission?.followup_answers || {});
          // Fetch existing signature
          if (result.submission?.id) {
            (supabase.from("contract_signatures" as any) as any)
              .select("*")
              .eq("submission_id", result.submission.id)
              .order("signed_at", { ascending: false })
              .limit(1)
              .single()
              .then(({ data: sig }: any) => {
                if (sig) setSignature(sig);
              });
          }
        }
        setLoading(false);
      });
  }, [token]);

  const saveFollowupAnswers = async () => {
    if (!token) return;
    setSavingFollowup(true);
    await supabase.rpc("save_portal_feedback" as any, {
      p_token: token,
      p_followup_answers: followupAnswers,
    } as any);
    setSavingFollowup(false);
    toast({ title: "Answers saved" });
  };

  const updateStatus = async (status: string) => {
    if (!token) return;
    setUpdating(true);
    const { error } = await supabase.rpc("update_submission_status", {
      p_token: token,
      p_status: status,
      p_comment: status === "needs_changes" ? comment : null,
    } as any) as any;
    setUpdating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Scope approved!" : "Change request submitted" });
      setChangesModalOpen(false);
      setApproveModalOpen(false);
      setApproveChecked(false);
      setComment("");
      // Notify workspace owner
      if (data?.submission?.id) {
        supabase.functions.invoke("send-notification", {
          body: {
            type: "client_status_update",
            submission_id: data.submission.id,
            status,
            app_url: window.location.origin,
          },
        }).catch((e) => console.error("Owner notification failed:", e));
      }
      const { data: result } = await supabase.rpc("get_submission_by_portal_token", { p_token: token } as any) as any;
      if (result) {
        setData(result);
        setSectionFeedback(result.submission?.section_feedback || {});
      }
    }
  };

  const saveSectionFeedback = async (updatedFeedback: Record<string, any>) => {
    if (!token) return;
    setSectionFeedback(updatedFeedback);
    await supabase.rpc("save_portal_feedback" as any, {
      p_token: token,
      p_section_feedback: updatedFeedback,
    } as any);
  };

  const handleSectionApprove = (key: string) => {
    const updated = { ...sectionFeedback, [key]: { status: "approved", at: new Date().toISOString() } };
    saveSectionFeedback(updated);
    toast({ title: `${REVIEWABLE_SECTIONS.find(s => s.key === key)?.label} approved` });
  };

  const handleSectionChange = (key: string, changeComment: string) => {
    const updated = { ...sectionFeedback, [key]: { status: "changes_requested", comment: changeComment, at: new Date().toISOString() } };
    saveSectionFeedback(updated);
    toast({ title: "Feedback submitted" });
  };


  const saveSignature = async (dataUrl: string) => {
    if (!data?.submission) return;
    setSavingSignature(true);
    const { data: sig, error } = await (supabase.from("contract_signatures" as any) as any).insert({
      submission_id: data.submission.id,
      signer_name: clientName,
      signer_email: clientEmail,
      signature_data: dataUrl,
      user_agent: navigator.userAgent,
    }).select().single();
    setSavingSignature(false);
    if (error) {
      toast({ title: "Error saving signature", description: error.message, variant: "destructive" });
    } else {
      setSignature(sig);
      toast({ title: "Signature saved!" });
    }
  };

  // No longer using built-in payment processing

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardContent className="py-14">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Not Found</h2>
          <p className="text-muted-foreground">This project summary link is invalid or has expired.</p>
        </CardContent>
      </Card>
    </div>
  );

  const submission = data?.submission;
  const fields = data?.fields || [];
  const report = data?.report;

  // normalize after data loads
  const normalized = submission ? normalizeSubmission(submission, getCoreReport(report)) : null;
  const mergedAnswers = normalized?.mergedAnswers || {};
  const clientName = normalized?.clientName || submission?.client_name;
  const clientEmail = normalized?.clientEmail || submission?.client_email;
  const structured = getCoreReport(report);

  // build grouped and flat follow‑up question lists for UI
  const followupGroups: { title: string; questions: string[] }[] = [];
  const followupQuestionsList: string[] = [];
  if (structured?.missing_info) {
    if (Array.isArray(structured.missing_info)) {
      followupGroups.push({ title: "Questions", questions: structured.missing_info });
      followupQuestionsList.push(...structured.missing_info);
    } else if (typeof structured.missing_info === "object") {
      Object.entries(structured.missing_info).forEach(([key, qs]) => {
        if (Array.isArray(qs)) {
          const title = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          followupGroups.push({ title, questions: qs });
          followupQuestionsList.push(...qs);
        }
      });
    }
  }
  if (structured?.needs_clarification && Array.isArray(structured.needs_clarification)) {
    followupGroups.push({ title: "Clarification", questions: structured.needs_clarification });
    followupQuestionsList.push(...structured.needs_clarification);
  }

  const status = submission?.status || "pending";
  const statusInfo = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;
  const isApproved = ["approved", "scope_locked", "project_started"].includes(status);

  // Workspace branding
  const workspace = data?.workspace;
  const brandName = workspace?.business_name || APP_NAME;
  const brandLogo = workspace?.logo_url;
  const brandColor = workspace?.brand_color || "#6366f1";


  // Dynamic brand color CSS variable
  const brandStyle = { "--brand-color": brandColor } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={brandStyle}>
      <style>{`
        [data-branded] .brand-accent { color: ${brandColor}; }
        [data-branded] .brand-bg { background-color: ${brandColor}; }
        [data-branded] .brand-bg:hover { background-color: ${brandColor}e6; }
        [data-branded] .brand-border { border-color: ${brandColor}33; }
        [data-branded] .brand-bg-light { background-color: ${brandColor}1a; }
      `}</style>
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border" data-branded>
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-6 w-6 rounded shrink-0 object-contain" />
            ) : (
              <Zap className="h-5 w-5 brand-accent shrink-0" style={{ color: brandColor }} />
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{data?.template_title || "Project Summary"}</h1>
              <p className="text-xs text-muted-foreground truncate">{brandName} · {clientName}</p>
            </div>
          </div>
          <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1.5 shrink-0 ${statusInfo.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </Badge>
        </div>
        {structured && (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap">
                {s.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Activity Timeline */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <span className="flex items-center gap-1.5 text-primary"><CheckCircle className="h-3 w-3" /> Submission Received</span>
                <span className={`flex items-center gap-1.5 ${report ? "text-primary" : "text-muted-foreground/40"}`}><CheckCircle className="h-3 w-3" /> Kickoff Pack Generated</span>
                <span className={`flex items-center gap-1.5 ${isApproved ? "text-primary" : "text-muted-foreground/40"}`}><CheckCircle className="h-3 w-3" /> Client Approved</span>
                <span className={`flex items-center gap-1.5 ${["scope_locked", "project_started"].includes(status) ? "text-primary" : "text-muted-foreground/40"}`}><LockIcon className="h-3 w-3" /> Scope Locked</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Info */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="shadow-md">
            <CardContent className="py-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Client</p>
                  <p className="text-sm font-semibold text-foreground">{clientName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm text-foreground">{clientEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Answers */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* hide redundant name/email entries */}
            {(() => {
              const hiddenFields = ["Client Full Name", "Client Email"];
              const visibleFields = fields.filter((f: any) => !hiddenFields.includes(f.label));
              return visibleFields.map((field: any) => {
                const val = mergedAnswers[field.id];
                return (
                  <div key={field.id} className="flex justify-between items-start gap-4 py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium text-foreground shrink-0">{field.label}</span>
                    <span className="text-sm text-muted-foreground text-right">
                      {field.field_type === "budget" ? formatBudgetValue(val) :
                       field.field_type === "timeline" ? formatTimelineValue(val) :
                       field.field_type === "file" && typeof val === "string" && val.startsWith("http") ? (
                         <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                           <ExternalLink className="h-3 w-3" /> View file
                         </a>
                       ) : String(val || "—")}
                    </span>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>



        {/* Report sections with per-section review */}
        {structured ? (
          <div className="space-y-8">
            {structured.executive_summary && (
              <div className="space-y-3">
                <SectionDivider id="overview" title="Executive Summary" />
                <Card className="shadow-sm">
                  <CardContent className="py-5">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{structured.executive_summary}</p>
                    {status === "pending" || isApproved ? (
                      <SectionReview
                        sectionKey="executive_summary"
                        sectionLabel="Executive Summary"
                        feedback={sectionFeedback}
                        onApprove={handleSectionApprove}
                        onRequestChange={handleSectionChange}
                        isApproved={isApproved}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}

            {structured.scope_doc && typeof structured.scope_doc === "object" && (
              <div className="space-y-3">
                <SectionDivider id="scope" title="Scope of Work" />
                <Card className="shadow-sm">
                  <CardContent className="py-5 space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">In Scope</p>
                      <ul className="text-sm text-foreground space-y-1.5">
                        {structured.scope_doc.in_scope?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Out of Scope</p>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        {structured.scope_doc.out_of_scope?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2"><span className="text-muted-foreground/50 mt-0.5 shrink-0">—</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                    <SectionReview
                      sectionKey="scope_of_work"
                      sectionLabel="Scope of Work"
                      feedback={sectionFeedback}
                      onApprove={handleSectionApprove}
                      onRequestChange={handleSectionChange}
                      isApproved={isApproved}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {structured.timeline && typeof structured.timeline === "object" && (
              <div className="space-y-3">
                <SectionDivider id="timeline" title="Timeline" />
                <Card className="shadow-sm">
                  <CardContent className="py-5 space-y-3">
                    <p className="text-sm text-foreground font-semibold">{structured.timeline.overview}</p>
                    {structured.timeline.breakdown?.map((b: any, i: number) => (
                      <div key={i} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">{b.period}</span>
                        <span className="text-sm text-muted-foreground">{b.activities}</span>
                      </div>
                    ))}
                    <SectionReview
                      sectionKey="timeline"
                      sectionLabel="Timeline"
                      feedback={sectionFeedback}
                      onApprove={handleSectionApprove}
                      onRequestChange={handleSectionChange}
                      isApproved={isApproved}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {structured.suggested_budget && (
              <div className="space-y-3">
                <SectionDivider id="budget" title="Budget Recommendation" />
                <Card className="shadow-sm">
                  <CardContent className="py-5 space-y-4">
                    <p className="text-sm text-foreground leading-relaxed">{structured.suggested_budget.analysis}</p>
                    <div className="grid gap-3">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">MVP / Minimum Viable</p>
                        <p className="text-sm text-foreground">{structured.suggested_budget.minimum_viable}</p>
                      </div>
                      <div className="rounded-lg bg-accent border border-primary/20 p-4">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Recommended</p>
                        <p className="text-sm text-foreground">{structured.suggested_budget.recommended}</p>
                      </div>
                      {structured.suggested_budget.premium && (
                        <div className="rounded-lg bg-muted/50 p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full / Premium</p>
                          <p className="text-sm text-foreground">{structured.suggested_budget.premium}</p>
                        </div>
                      )}
                    </div>
                    <SectionReview
                      sectionKey="budget"
                      sectionLabel="Budget"
                      feedback={sectionFeedback}
                      onApprove={handleSectionApprove}
                      onRequestChange={handleSectionChange}
                      isApproved={isApproved}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {structured.risks && Array.isArray(structured.risks) && structured.risks.length > 0 && (
              <div className="space-y-3">
                <SectionDivider id="risks" title="Risks" />
                <Card className="shadow-sm">
                  <CardContent className="py-5 space-y-3">
                    {structured.risks.map((r: any, i: number) => {
                      const risk = typeof r === "string" ? (() => { try { return JSON.parse(r); } catch { return { risk: r }; } })() : r;
                      return (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{risk.risk}</span>
                            {risk.severity && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{risk.severity}</Badge>}
                          </div>
                          {risk.mitigation && <p className="text-xs text-muted-foreground">Mitigation: {risk.mitigation}</p>}
                        </div>
                      );
                    })}
                    <SectionReview
                      sectionKey="risks"
                      sectionLabel="Risks"
                      feedback={sectionFeedback}
                      onApprove={handleSectionApprove}
                      onRequestChange={handleSectionChange}
                      isApproved={isApproved}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {followupGroups.length > 0 && (
              <div className="space-y-6" id="followup">
                <SectionDivider id="followup-section" title="Follow-up Questions" />
                <Card className="shadow-sm">
                  <CardContent className="py-5 space-y-6">
                    <p className="text-sm text-muted-foreground">Please answer these follow-up questions to help refine the final project scope.</p>
                    {followupGroups.map((group, gi) => (
                      <div key={gi} className="space-y-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h3>
                        {group.questions.map((q, qi) => {
                          const index = followupQuestionsList.indexOf(q);
                          const key = `q_${index}`;
                          const val = followupAnswers[key] || "";
                          return (
                            <div key={qi} className="space-y-1">
                              <p className="text-sm text-foreground">{q}</p>
                              <Textarea
                                value={val}
                                onChange={(e) => setFollowupAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                                rows={3}
                                className="w-full"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveFollowupAnswers}
                      disabled={savingFollowup}
                    >
                      {savingFollowup ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Save Answers
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {structured.next_step_recommendation && (
              <Card className="shadow-sm border-primary/20 bg-primary/5">
                <CardContent className="py-5">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Recommended Next Step</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {typeof structured.next_step_recommendation === "string"
                      ? structured.next_step_recommendation
                      : structured.next_step_recommendation.summary || JSON.stringify(structured.next_step_recommendation)}
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        ) : report ? (
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Project Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{report.summary || "Report is being generated…"}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">The project kickoff report hasn't been generated yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon — your consultant is preparing it.</p>
            </CardContent>
          </Card>
        )}

        {/* E-Signature & Contract */}
        {isApproved && (
          <Card className="shadow-sm border-primary/20">
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Service Agreement</p>
                  <p className="text-xs text-muted-foreground">Auto-generated from approved scope</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => generateContractPDF(submission, data?.template_title, structured, workspace)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download Contract (PDF)
                </Button>
              </div>

              {/* Signature section */}
              {signature ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Signed by {signature.signer_name}</p>
                  </div>
                  <img src={signature.signature_data} alt="Signature" className="h-16 object-contain" />
                  <p className="text-xs text-muted-foreground">
                    Signed on {new Date(signature.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" • "}{signature.signer_email}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Sign this agreement</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By signing below, you confirm your agreement to the scope and terms outlined in this contract.
                  </p>
                  <SignaturePad onSave={saveSignature} disabled={savingSignature} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Scope Locked */}
        {["scope_locked", "project_started"].includes(status) && (
          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardContent className="py-5 text-center">
              <LockIcon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Scope is locked. Your project is ready to begin.</p>
              {submission?.approved_at && (
                <p className="text-xs text-muted-foreground mt-1">Approved on {new Date(submission.approved_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback comment if already submitted */}
        {status === "needs_changes" && submission?.status_comment && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-semibold">Your Feedback</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground">{submission.status_comment}</p></CardContent>
          </Card>
        )}

        {/* Spacer for sticky bar */}
        {status === "pending" && <div className="h-20" />}
      </div>

      {/* Sticky action bar */}
      {status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button className="flex-1 h-11 font-semibold" style={{ backgroundColor: brandColor, color: "#fff" }} onClick={() => setApproveModalOpen(true)} disabled={updating}>
              <CheckCircle className="h-4 w-4 mr-2" /> Approve Full Scope
            </Button>
            <Button variant="outline" className="flex-1 h-11 font-semibold" onClick={() => setChangesModalOpen(true)} disabled={updating}>
              <AlertCircle className="h-4 w-4 mr-2" /> Request Changes
            </Button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Project Scope</DialogTitle>
            <DialogDescription>I approve the scope, deliverables, and timeline outlined in this kickoff pack.</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <Checkbox id="approve-check" checked={approveChecked} onCheckedChange={(c) => setApproveChecked(!!c)} />
            <label htmlFor="approve-check" className="text-sm text-foreground leading-snug cursor-pointer">
              I understand that approving this scope will initiate the project agreement.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveModalOpen(false); setApproveChecked(false); }}>Cancel</Button>
            <Button onClick={() => updateStatus("approved")} disabled={updating || !approveChecked}>
              {updating ? "Confirming…" : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={changesModalOpen} onOpenChange={setChangesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>Describe what needs to be changed. Your feedback will be shared with the project lead.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Describe the changes you'd like." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-2" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesModalOpen(false)}>Cancel</Button>
            <Button onClick={() => updateStatus("needs_changes")} disabled={updating || !comment.trim()}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
