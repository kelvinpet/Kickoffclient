import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Mail, FileText, Clock, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface Client {
  email: string;
  name: string;
  submissionCount: number;
  approvedCount: number;
  pendingCount: number;
  lastActivity: string;
  firstActivity: string;
  statuses: string[];
  submissions: { id: string; status: string; created_at: string; template_title: string }[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] as const } }),
};

export default function Clients() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    fetchClients();
  }, [workspace]);

  const fetchClients = async () => {
    if (!workspace) return;
    setLoading(true);

    const { data: subs } = await supabase
      .from("submissions")
      .select("id, client_name, client_email, status, created_at, templates!inner(workspace_id, title)")
      .eq("templates.workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    if (!subs) { setLoading(false); return; }

    const clientMap = new Map<string, Client>();
    for (const s of subs) {
      const email = s.client_email.toLowerCase();
      const templateTitle = (s as any).templates?.title || "Unknown";
      const isApproved = ["approved", "scope_locked", "project_started"].includes(s.status);
      const isPending = s.status === "pending";
      const existing = clientMap.get(email);

      if (existing) {
        existing.submissionCount++;
        if (isApproved) existing.approvedCount++;
        if (isPending) existing.pendingCount++;
        if (!existing.statuses.includes(s.status)) existing.statuses.push(s.status);
        existing.submissions.push({ id: s.id, status: s.status, created_at: s.created_at, template_title: templateTitle });
        if (new Date(s.created_at) > new Date(existing.lastActivity)) {
          existing.lastActivity = s.created_at;
          existing.name = s.client_name || existing.name;
        }
        if (new Date(s.created_at) < new Date(existing.firstActivity)) {
          existing.firstActivity = s.created_at;
        }
      } else {
        clientMap.set(email, {
          email: s.client_email,
          name: s.client_name,
          submissionCount: 1,
          approvedCount: isApproved ? 1 : 0,
          pendingCount: isPending ? 1 : 0,
          lastActivity: s.created_at,
          firstActivity: s.created_at,
          statuses: [s.status],
          submissions: [{ id: s.id, status: s.status, created_at: s.created_at, template_title: templateTitle }],
        });
      }
    }

    setClients(Array.from(clientMap.values()).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()));
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, search]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  const totalProjects = clients.reduce((a, c) => a + c.submissionCount, 0);
  const totalApproved = clients.reduce((a, c) => a + c.approvedCount, 0);
  const repeatClients = clients.filter((c) => c.submissionCount > 1).length;

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    approved: "bg-primary/10 text-primary border-primary/20",
    needs_changes: "bg-destructive/10 text-destructive border-destructive/20",
    scope_locked: "bg-primary/10 text-primary border-primary/20",
    project_started: "bg-success/10 text-success border-success/20",
  };

  if (wsLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} unique client{clients.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clients", value: clients.length, icon: Users, color: "text-primary" },
            { label: "Total Projects", value: totalProjects, icon: FileText, color: "text-primary" },
            { label: "Approved", value: totalApproved, icon: TrendingUp, color: "text-success" },
            { label: "Repeat Clients", value: repeatClients, icon: DollarSign, color: "text-warning" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No clients match your search" : "No clients yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((client, i) => (
            <motion.div key={client.email} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <Card
                className={`hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer ${
                  expandedEmail === client.email ? "border-primary/30" : ""
                }`}
                onClick={() => setExpandedEmail(expandedEmail === client.email ? null : client.email)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        {client.submissionCount > 1 && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                            {client.submissionCount}x
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {client.email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-bold text-foreground">{client.submissionCount}</p>
                        <span className="text-[10px] text-muted-foreground">project{client.submissionCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-bold text-success">{client.approvedCount}</p>
                        <span className="text-[10px] text-muted-foreground">approved</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(client.lastActivity)}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">last active</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: submission history */}
                  {expandedEmail === client.email && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-border space-y-2"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Project History</p>
                      {client.submissions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/app/submissions/${sub.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between py-2 px-3 -mx-3 rounded-md hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate">{sub.template_title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[sub.status] || ""}`}>
                              {sub.status.replace("_", " ")}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{formatDate(sub.created_at)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      ))}
                      <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground">
                        <span>First contact: {formatDate(client.firstActivity)}</span>
                        <span>·</span>
                        <span>Client since {new Date(client.firstActivity).toLocaleDateString("en", { month: "long", year: "numeric" })}</span>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
