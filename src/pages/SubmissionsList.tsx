import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, CheckCircle, Clock, AlertCircle, Lock as LockIcon, Search, Trash2, Loader2, X, Filter } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
  needs_changes: { label: "Changes Requested", icon: AlertCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  scope_locked: { label: "Scope Locked", icon: LockIcon, color: "bg-primary/10 text-primary border-primary/20" },
  project_started: { label: "Started", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function SubmissionsList() {
  const { workspace } = useWorkspace();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    supabase
      .from("submissions")
      .select("*, templates!inner(workspace_id, title)")
      .eq("templates.workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSubmissions(data || []);
        setLoading(false);
      });
  }, [workspace]);

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.client_name?.toLowerCase().includes(q) ||
      s.client_email?.toLowerCase().includes(q) ||
      (s as any).templates?.title?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || (s as any).status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isSelecting = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("submissions").delete().in("id", ids);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      setSubmissions((prev) => prev.filter((s) => !selected.has(s.id)));
      toast({ title: `${ids.length} submission${ids.length > 1 ? "s" : ""} deleted` });
      setSelected(new Set());
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Submissions</h1>
        {isSelecting && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {!loading && submissions.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name, email, or template…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] shrink-0">
              <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll} className="shrink-0 text-xs">
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No submissions match your search." : "No submissions yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const status = (s as any).status || "pending";
            const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const StatusIcon = statusInfo.icon;
            const isChecked = selected.has(s.id);
            return (
              <motion.div key={s.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <Card className={`group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 ${isChecked ? "border-destructive/40 bg-destructive/5" : ""}`}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleSelect(s.id)}
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Link to={`/app/submissions/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{s.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.client_email} — {(s as any).templates?.title}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${statusInfo.color} text-[10px] px-2 py-0.5 shrink-0 hidden sm:flex`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} submission{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected submission{selected.size > 1 ? "s" : ""} and all related data (kickoff packs, signatures, etc.). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : `Delete ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
