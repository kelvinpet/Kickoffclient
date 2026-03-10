import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, ArrowRight, Search, MoreHorizontal, Copy, Pencil, Archive, Trash2, Inbox } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3, ease: [0, 0, 0.2, 1] as const } }),
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TemplatesList() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const { data } = await supabase
      .from("templates")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    const tpls = data || [];
    setTemplates(tpls);

    if (tpls.length > 0) {
      const ids = tpls.map((t) => t.id);
      const [fieldsRes, subsRes] = await Promise.all([
        supabase.from("template_fields").select("template_id").in("template_id", ids),
        supabase.from("submissions").select("template_id").in("template_id", ids),
      ]);

      const fCounts: Record<string, number> = {};
      (fieldsRes.data || []).forEach((f: any) => { fCounts[f.template_id] = (fCounts[f.template_id] || 0) + 1; });
      setFieldCounts(fCounts);

      const sCounts: Record<string, number> = {};
      (subsRes.data || []).forEach((s: any) => { sCounts[s.template_id] = (sCounts[s.template_id] || 0) + 1; });
      setSubmissionCounts(sCounts);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    let result = templates.filter((t) => {
      const statusMatch = showArchived ? true : (t.status || 'active') === 'active';
      const searchMatch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
    switch (sort) {
      case "oldest": return result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "az": return result.sort((a, b) => a.title.localeCompare(b.title));
      case "za": return result.sort((a, b) => b.title.localeCompare(a.title));
      default: return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [templates, search, sort, showArchived]);

  const handleDuplicate = async (template: any) => {
    if (!workspace) return;
    setActionLoading(true);
    try {
      const { data: newTpl, error } = await supabase
        .from("templates")
        .insert({
          workspace_id: workspace.id,
          title: `${template.title} (Copy)`,
          description: template.description,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;

      const { data: fields } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", template.id)
        .order("position");

      if (fields && fields.length > 0) {
        const cloned = fields.map((f: any) => ({
          template_id: newTpl.id,
          label: f.label,
          field_type: f.field_type,
          required: f.required,
          options: f.options,
          position: f.position,
        }));
        await supabase.from("template_fields").insert(cloned);
      }

      toast({ title: "Duplicated", description: `"${newTpl.title}" created.` });
      navigate(`/app/templates/${newTpl.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("templates")
      .update({ status: 'archived' } as any)
      .eq("id", archiveTarget.id);
    setActionLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Archived", description: `"${archiveTarget.title}" has been archived.` });
      setArchiveTarget(null);
      fetchTemplates();
    }
  };

  const handleUnarchive = async (template: any) => {
    const { error } = await supabase
      .from("templates")
      .update({ status: 'active' } as any)
      .eq("id", template.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Restored", description: `"${template.title}" is active again.` });
      fetchTemplates();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;
    setActionLoading(true);
    await supabase.from("template_fields").delete().eq("template_id", deleteTarget.id);
    const { error } = await supabase.from("templates").delete().eq("id", deleteTarget.id);
    setActionLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `"${deleteTarget.title}" has been permanently deleted.` });
      setDeleteTarget(null);
      setDeleteConfirm("");
      fetchTemplates();
    }
  };

  const openDeleteOrArchive = (template: any) => {
    const subCount = submissionCounts[template.id] || 0;
    if (subCount > 0) {
      setArchiveTarget(template);
    } else {
      setDeleteTarget(template);
      setDeleteConfirm("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Templates</h1>
        <Link to="/app/templates/new">
          <Button><Plus className="h-4 w-4 mr-2" /> New Template</Button>
        </Link>
      </div>

      {/* Search + Sort + Archive toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="az">A → Z</SelectItem>
            <SelectItem value="za">Z → A</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived" className="text-xs text-muted-foreground whitespace-nowrap">Show archived</Label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No templates match your search." : showArchived ? "No templates found." : "No templates yet. Create your first one!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => {
            const isArchived = t.status === 'archived';
            const subCount = submissionCounts[t.id] || 0;
            const fCount = fieldCounts[t.id] || 0;
            return (
              <motion.div key={t.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <Card
                  className={`group cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 ${isArchived ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/app/templates/${t.id}`)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                      {isArchived ? <Archive className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{t.title}</p>
                        {isArchived && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Archived</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fCount} field{fCount !== 1 ? "s" : ""} • {subCount} submission{subCount !== 1 ? "s" : ""} • Updated {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => navigate(`/app/templates/${t.id}`)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(t)} disabled={actionLoading}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          {isArchived ? (
                            <DropdownMenuItem onClick={() => handleUnarchive(t)}>
                              <Inbox className="h-3.5 w-3.5 mr-2" /> Restore
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          {isArchived ? (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setDeleteTarget(t); setDeleteConfirm(""); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete permanently
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteOrArchive(t)}>
                              {subCount > 0 ? <Archive className="h-3.5 w-3.5 mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />}
                              {subCount > 0 ? "Archive" : "Delete"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Archive Modal */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive template</DialogTitle>
            <DialogDescription>
              This hides "{archiveTarget?.title}" from your templates list and disables new client links. Existing submissions remain accessible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button onClick={handleArchive} disabled={actionLoading}>
              {actionLoading ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template permanently</DialogTitle>
            <DialogDescription>
              This will permanently delete "{deleteTarget?.title}" and all its fields. This action cannot be undone. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirm !== "DELETE" || actionLoading}>
              {actionLoading ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
