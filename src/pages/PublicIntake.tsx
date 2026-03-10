import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, CheckCircle, Upload, X, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "NGN", symbol: "₦", label: "NGN (₦)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "CAD", symbol: "CA$", label: "CAD (CA$)" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)" },
];

const TIMELINE_OPTIONS = [
  "1–2 weeks",
  "3–4 weeks",
  "1–2 months",
  "3 months",
  "6 months",
  "Flexible",
];

export default function PublicIntake() {
  const { publicId } = useParams<{ publicId: string }>();
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, { name: string; url: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [portalToken, setPortalToken] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!publicId) return;
    supabase
      .from("templates")
      .select("*")
      .eq("public_id", publicId)
      .single()
      .then(({ data }) => {
        setTemplate(data);
        if (data) {
          supabase
            .from("template_fields")
            .select("*")
            .eq("template_id", data.id)
            .order("position")
            .then(({ data: fData }) => setFields(fData || []));
        }
      });
  }, [publicId]);

  const handleFileUpload = async (fieldId: string, file: File) => {
    const path = `submissions/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
    setFileUploads((prev) => ({ ...prev, [fieldId]: { name: file.name, url: urlData.publicUrl } }));
    setAnswers((prev) => ({ ...prev, [fieldId]: urlData.publicUrl }));
  };

  const removeFile = (fieldId: string) => {
    setFileUploads((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleDrop = useCallback((fieldId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(fieldId, file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    // Validate built-in identity fields
    if (!clientName.trim()) {
      toast({ title: "Missing required field", description: '"Client Full Name" is required.', variant: "destructive" });
      return;
    }
    if (!clientEmail.trim()) {
      toast({ title: "Missing required field", description: '"Client Email" is required.', variant: "destructive" });
      return;
    }

    // Only validate dynamic (non-identity) fields that are actually rendered
    for (const f of dynamicFields) {
      if (!f.required) continue;
      const val = answers[f.id];
      // Handle complex field types
      if (f.field_type === "budget") {
        if (!val || (typeof val === "object" && !val.amount)) {
          toast({ title: "Missing required field", description: `"${f.label}" is required.`, variant: "destructive" });
          return;
        }
      } else if (f.field_type === "timeline") {
        if (!val || (typeof val === "object" && !val.selection)) {
          toast({ title: "Missing required field", description: `"${f.label}" is required.`, variant: "destructive" });
          return;
        }
      } else if (!val) {
        toast({ title: "Missing required field", description: `"${f.label}" is required.`, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const files = Object.values(fileUploads).map((f) => f.url);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("submit-intake", {
        body: {
          public_id: publicId,
          client_name: clientName,
          client_email: clientEmail,
          answers,
          files,
        },
      });
      setSubmitting(false);
      if (fnError || fnData?.error) {
        toast({ title: "Error", description: fnData?.error || fnError?.message || "Submission failed", variant: "destructive" });
      } else {
        setPortalToken(fnData?.portal_token || "");
        setSubmitted(true);
      }
    } catch (err: any) {
      setSubmitting(false);
      toast({ title: "Error", description: err.message || "Submission failed", variant: "destructive" });
    }
  };

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (submitted) {
    const portalUrl = portalToken ? `${window.location.origin}/portal/${portalToken}` : "";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="max-w-md w-full text-center shadow-xl shadow-primary/5">
            <CardContent className="py-14 space-y-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Thank you!</h2>
              <p className="text-muted-foreground">Your response has been submitted successfully, {clientName}.</p>
              {portalUrl && (
                <div className="pt-2 space-y-3">
                  <p className="text-sm text-muted-foreground">Bookmark this link to view your project summary once it's ready:</p>
                  <a
                    href={portalUrl}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium bg-primary/5 px-4 py-2.5 rounded-lg transition-colors hover:bg-primary/10"
                  >
                    <ExternalLink className="h-4 w-4" /> View your project portal
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Separate fields by type for intelligent layout
  const isIdentityField = (f: any) => {
    const l = f.label.toLowerCase();
    return l.includes("client name") || l.includes("full name") || l.includes("your name") ||
           l.includes("client email") || l.includes("your email") || l.includes("email address");
  };

  // Filter out duplicate identity fields (we have built-in ones)
  const dynamicFields = fields.filter((f) => !isIdentityField(f));

  const renderField = (field: any) => {
    const isWide = ["textarea"].includes(field.field_type);

    return (
      <div key={field.id} className={`space-y-2 ${isWide ? "sm:col-span-2" : ""}`}>
        <Label className="text-sm font-medium text-foreground">
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>

        {field.field_type === "text" && (
          <Input
            value={answers[field.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
            className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
          />
        )}

        {field.field_type === "textarea" && (
          <Textarea
            value={answers[field.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
            rows={5}
            className="transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary resize-none"
          />
        )}

        {field.field_type === "number" && (
          <Input
            type="number"
            value={answers[field.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
            className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
          />
        )}

        {field.field_type === "budget" && (
          <div className="flex gap-2">
            <Select
              value={(answers[field.id] as any)?.currency || "USD"}
              onValueChange={(v) =>
                setAnswers({
                  ...answers,
                  [field.id]: { ...(typeof answers[field.id] === "object" ? answers[field.id] : {}), currency: v, amount: (answers[field.id] as any)?.amount || "" },
                })
              }
            >
              <SelectTrigger className="w-32 h-11 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount"
              value={(answers[field.id] as any)?.amount || ""}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [field.id]: {
                    currency: (answers[field.id] as any)?.currency || "USD",
                    amount: e.target.value,
                  },
                })
              }
              className="flex-1 h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
            />
          </div>
        )}

        {field.field_type === "timeline" && (
          <div className="space-y-2.5">
            <Select
              value={answers[field.id]?.selection || ""}
              onValueChange={(v) =>
                setAnswers({ ...answers, [field.id]: { selection: v, note: answers[field.id]?.note || "" } })
              }
            >
              <SelectTrigger className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10">
                <SelectValue placeholder="Select timeline…" />
              </SelectTrigger>
              <SelectContent position="popper">
                {TIMELINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Specific deadline (optional) — e.g. 'Must launch by March 15'"
              value={answers[field.id]?.note || ""}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [field.id]: { selection: answers[field.id]?.selection || "", note: e.target.value },
                })
              }
              className="text-sm h-10 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
            />
          </div>
        )}

        {field.field_type === "select" && (
          <Select
            value={answers[field.id] || ""}
            onValueChange={(v) => setAnswers({ ...answers, [field.id]: v })}
          >
            <SelectTrigger className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent position="popper">
              {Array.isArray(field.options) && field.options.length > 0 ? (
                field.options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>No options available</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}

        {field.field_type === "file" && (
          <div
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer
              ${dragOver === field.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : fileUploads[field.id]
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(field.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(field.id, e)}
            onClick={() => document.getElementById(`file-${field.id}`)?.click()}
          >
            <input
              id={`file-${field.id}`}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(field.id, file);
              }}
            />
            {fileUploads[field.id] ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground font-medium">{fileUploads[field.id].name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(field.id); }}
                  className="ml-1 p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium">
                  Drag files here or <span className="text-primary">click to upload</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, ZIP — logos, brand guides, screenshots
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="w-full max-w-[640px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-xl shadow-primary/5 border-border/50">
            <CardHeader className="pb-2 pt-8 px-8">
              <CardTitle className="text-2xl">{template.title}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{template.description}</p>
              )}
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {/* Row 1: Client Name | Client Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Client Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                      className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Client Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      placeholder="jane@company.com"
                      className="h-11 transition-all duration-200 focus:shadow-md focus:shadow-primary/10 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Dynamic fields — duplicate identity fields excluded */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {dynamicFields.map(renderField)}
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Powered by — positioned cleanly at bottom */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Zap className="h-3 w-3" />
            <span>Powered by KickoffClient</span>
          </div>
        </div>
      </div>
    </div>
  );
}
