import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Link as LinkIcon, DollarSign, Clock, GripVertical, Pencil, Check, X, ChevronsUpDown } from "lucide-react";

const LABEL_PRESETS_BY_TYPE: Record<string, string[]> = {
  text: [
    "Client Full Name",
    "Company Name", 
    "Project Title",
    "Contact Person",
    "Job Title",
    "Website URL",
  ],
  textarea: [
    "Project Description",
    "Project Goals", 
    "Additional Notes",
    "Special Requirements",
    "Brand Guidelines",
    "Reference Links",
  ],
  select: [
    "Project Type",
    "Service Category", 
    "Industry",
    "Priority Level",
    "Preferred Communication",
  ],
  number: [
    "Team Size",
    "Number of Pages",
    "Quantity",
    "Duration (months)",
  ],
  budget: [
    "Project Budget",
    "Budget Range",
    "Investment Amount",
    "Maximum Budget",
  ],
  timeline: [
    "Project Timeline", 
    "Preferred Start Date",
    "Launch Date",
    "Deadline",
  ],
  file: [
    "Logo Files",
    "Brand Assets", 
    "Reference Documents",
    "Current Materials",
  ],
};

const ALL_LABELS = Object.values(LABEL_PRESETS_BY_TYPE).flat().concat([
  "Email Address",
  "Phone Number", 
  "Target Audience",
]);

const FIELD_TYPES = ["text", "textarea", "select", "number", "budget", "timeline", "file"];

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Long Text",
  select: "Dropdown",
  number: "Number",
  budget: "Budget",
  timeline: "Timeline",
  file: "File Upload",
};

interface Field {
  id?: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  position: number;
}

function LabelCombobox({ value, fieldType, onChange }: { value: string; fieldType: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  
  // Get presets for this field type, fallback to all labels
  const typePresets = LABEL_PRESETS_BY_TYPE[fieldType] || [];
  const otherLabels = ALL_LABELS.filter(label => !typePresets.includes(label));
  const allPresets = [...typePresets, ...otherLabels];
  const filtered = allPresets.filter((p) => p.toLowerCase().includes(value.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Type or select a label…"
          />
          <ChevronsUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1 max-h-[300px] overflow-y-auto" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No presets match. Using custom label.</p>
        ) : (
          <>
            {typePresets.filter(p => filtered.includes(p)).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  Suggested for {FIELD_TYPE_LABELS[fieldType]}
                </div>
                {typePresets.filter(p => filtered.includes(p)).map((preset) => (
                  <button
                    key={preset}
                    className="w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => { onChange(preset); setOpen(false); }}
                  >
                    {preset}
                  </button>
                ))}
                {otherLabels.filter(p => filtered.includes(p)).length > 0 && (
                  <div className="h-px bg-border my-1" />
                )}
              </>
            )}
            {otherLabels.filter(p => filtered.includes(p)).map((preset) => (
              <button
                key={preset}
                className="w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors opacity-75"
                onClick={() => { onChange(preset); setOpen(false); }}
              >
                {preset}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function TemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Inline editing for title/description
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("templates").select("*").eq("id", id).single().then(({ data }) => {
      setTemplate(data);
      if (data) { setTitleDraft(data.title); setDescDraft(data.description || ""); }
    });
    supabase
      .from("template_fields")
      .select("*")
      .eq("template_id", id)
      .order("position")
      .then(({ data }) => setFields((data || []).map((f: any) => ({ ...f, options: Array.isArray(f.options) ? f.options : [] }))));
  }, [id]);

  const saveTitle = async () => {
    if (!id || !titleDraft.trim()) return;
    await supabase.from("templates").update({ title: titleDraft.trim() } as any).eq("id", id);
    setTemplate((t: any) => ({ ...t, title: titleDraft.trim() }));
    setEditingTitle(false);
    toast({ title: "Saved", description: "Template name updated." });
  };

  const saveDesc = async () => {
    if (!id) return;
    await supabase.from("templates").update({ description: descDraft } as any).eq("id", id);
    setTemplate((t: any) => ({ ...t, description: descDraft }));
    setEditingDesc(false);
    toast({ title: "Saved", description: "Description updated." });
  };

  const addField = () => {
    setFields([...fields, { label: "", field_type: "text", required: false, options: [], position: fields.length }]);
  };

  const removeField = (idx: number) => {
    const f = fields[idx];
    if (f.id) {
      supabase.from("template_fields").delete().eq("id", f.id).then(() => {});
    }
    setFields(fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, updates: Partial<Field>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  // Drag and drop reorder
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => {
    if (dragIdx.current === null || dragIdx.current === idx) { setDragOverIdx(null); return; }
    const updated = [...fields];
    const [moved] = updated.splice(dragIdx.current, 1);
    updated.splice(idx, 0, moved);
    setFields(updated.map((f, i) => ({ ...f, position: i })));
    dragIdx.current = null;
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setDragOverIdx(null); };

  const saveFields = async () => {
    if (!id) return;
    setSaving(true);
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const payload = {
        template_id: id,
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        options: f.options,
        position: i,
      };
      if (f.id) {
        await supabase.from("template_fields").update(payload).eq("id", f.id);
      } else {
        const { data } = await supabase.from("template_fields").insert(payload).select().single();
        if (data) fields[i].id = data.id;
      }
    }
    setSaving(false);
    toast({ title: "Saved", description: "Template fields saved successfully." });
  };

  const shareUrl = template ? `${window.location.origin}/t/${template.public_id}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Copied!", description: "Share link copied to clipboard." });
  };

  if (!template) return <div className="text-muted-foreground p-8 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Editable Title */}
      <div>
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="text-2xl font-bold h-auto py-1" autoFocus />
            <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditingTitle(false); setTitleDraft(template.title); }}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingTitle(true)}>
            <h1 className="text-2xl font-bold text-foreground">{template.title}</h1>
            <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {editingDesc ? (
          <div className="flex items-start gap-2 mt-1">
            <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={2} className="text-sm" autoFocus />
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={saveDesc}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { setEditingDesc(false); setDescDraft(template.description || ""); }}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setEditingDesc(true)}
          >
            {template.description || "Click to add description…"}
          </p>
        )}
      </div>

      {/* Share Link */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Share Link</CardTitle>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-foreground">{shareUrl}</span>
          </div>
        </CardContent>
      </Card>

      {/* Fields with Drag & Drop */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fields</CardTitle>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No fields yet. Add your first field above.</p>
          )}
          {fields.map((field, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg p-4 space-y-3 transition-all ${dragOverIdx === idx ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Label</Label>
                  <LabelCombobox
                    value={field.label}
                    fieldType={field.field_type}
                    onChange={(v) => updateField(idx, { label: v })}
                  />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={field.field_type} onValueChange={(v) => updateField(idx, { field_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeField(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={field.required} onCheckedChange={(c) => updateField(idx, { required: !!c })} />
                <Label className="text-xs">Required</Label>
              </div>
              {field.field_type === "select" && (
                <div className="space-y-1">
                  <Label className="text-xs">Options (comma-separated)</Label>
                  <Input
                    value={field.options.join(", ")}
                    onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Option 1, Option 2"
                  />
                </div>
              )}
              {field.field_type === "budget" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Client will enter a monetary amount with currency formatting.</span>
                </div>
              )}
              {field.field_type === "timeline" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Client picks from preset timeline options or enters a custom deadline.</span>
                </div>
              )}
            </div>
          ))}
          {fields.length > 0 && (
            <Button onClick={saveFields} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save Fields"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
