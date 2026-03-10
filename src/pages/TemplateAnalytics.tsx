import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from "recharts";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Clock, CheckCircle2, FileText, Users, ArrowDown } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(142 71% 45%)",
  "hsl(220 9% 46%)",
];

interface TemplateStats {
  id: string;
  title: string;
  status: string;
  fieldCount: number;
  totalSubmissions: number;
  approvedCount: number;
  pendingCount: number;
  changesCount: number;
  hasReportCount: number;
  avgTurnaroundDays: number | null;
  submissionsByWeek: { week: string; count: number }[];
}

export default function TemplateAnalytics() {
  const { workspace } = useWorkspace();
  const [templates, setTemplates] = useState<TemplateStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("all");

  useEffect(() => {
    if (!workspace) return;
    fetchAnalytics();
  }, [workspace]);

  const fetchAnalytics = async () => {
    if (!workspace) return;
    setLoading(true);

    const { data: tpls } = await supabase
      .from("templates")
      .select("id, title, status")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    if (!tpls || tpls.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const ids = tpls.map((t) => t.id);

    const [fieldsRes, subsRes, reportsRes] = await Promise.all([
      supabase.from("template_fields").select("template_id").in("template_id", ids),
      supabase.from("submissions").select("id, template_id, status, created_at, approved_at").in("template_id", ids),
      supabase.from("ai_reports").select("submission_id"),
    ]);

    const fields = fieldsRes.data || [];
    const subs = subsRes.data || [];
    const reports = new Set((reportsRes.data || []).map((r) => r.submission_id));

    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

    const stats: TemplateStats[] = tpls.map((t) => {
      const tSubs = subs.filter((s) => s.template_id === t.id);
      const approved = tSubs.filter((s) => ["approved", "scope_locked", "project_started"].includes(s.status));
      const pending = tSubs.filter((s) => s.status === "pending");
      const changes = tSubs.filter((s) => s.status === "needs_changes");
      const hasReport = tSubs.filter((s) => reports.has(s.id));

      const turnarounds = approved
        .filter((s) => s.approved_at)
        .map((s) => (new Date(s.approved_at!).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const avgTurnaround = turnarounds.length > 0
        ? Math.round((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length) * 10) / 10
        : null;

      const weekMap: Record<string, number> = {};
      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000);
        const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        weekMap[label] = 0;
      }
      tSubs.forEach((s) => {
        const d = new Date(s.created_at);
        if (d >= eightWeeksAgo) {
          const weekKeys = Object.keys(weekMap);
          const weekIdx = Math.floor((d.getTime() - eightWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const clampedIdx = Math.min(weekIdx, 7);
          const key = weekKeys[clampedIdx];
          if (key) weekMap[key] = (weekMap[key] || 0) + 1;
        }
      });

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        fieldCount: fields.filter((f) => f.template_id === t.id).length,
        totalSubmissions: tSubs.length,
        approvedCount: approved.length,
        pendingCount: pending.length,
        changesCount: changes.length,
        hasReportCount: hasReport.length,
        avgTurnaroundDays: avgTurnaround,
        submissionsByWeek: Object.entries(weekMap).map(([week, count]) => ({ week, count })),
      };
    });

    setTemplates(stats);
    setLoading(false);
  };

  const selected = useMemo(() => {
    if (selectedId === "all") return null;
    return templates.find((t) => t.id === selectedId) || null;
  }, [selectedId, templates]);

  const totals = useMemo(() => {
    const list = selected ? [selected] : templates;
    return {
      submissions: list.reduce((a, t) => a + t.totalSubmissions, 0),
      approved: list.reduce((a, t) => a + t.approvedCount, 0),
      pending: list.reduce((a, t) => a + t.pendingCount, 0),
      changes: list.reduce((a, t) => a + t.changesCount, 0),
      hasReport: list.reduce((a, t) => a + t.hasReportCount, 0),
      avgTurnaround: (() => {
        const vals = list.filter((t) => t.avgTurnaroundDays !== null).map((t) => t.avgTurnaroundDays!);
        return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      })(),
    };
  }, [selected, templates]);

  const approvalRate = totals.submissions > 0 ? Math.round((totals.approved / totals.submissions) * 100) : 0;

  const statusBreakdown = [
    { name: "Approved", value: totals.approved },
    { name: "Pending", value: totals.pending },
    { name: "Changes Requested", value: totals.changes },
    { name: "Other", value: Math.max(0, totals.submissions - totals.approved - totals.pending - totals.changes) },
  ].filter((s) => s.value > 0);

  const weeklyData = useMemo(() => {
    if (selected) return selected.submissionsByWeek;
    const merged: Record<string, number> = {};
    templates.forEach((t) => {
      t.submissionsByWeek.forEach(({ week, count }) => {
        merged[week] = (merged[week] || 0) + count;
      });
    });
    return Object.entries(merged).map(([week, count]) => ({ week, count }));
  }, [selected, templates]);

  // Conversion funnel data
  const funnelData = useMemo(() => {
    if (totals.submissions === 0) return [];
    return [
      { name: "Intake Received", value: totals.submissions, fill: PIE_COLORS[0] },
      { name: "Report Generated", value: totals.hasReport, fill: PIE_COLORS[1] },
      { name: "Approved", value: totals.approved, fill: PIE_COLORS[3] },
    ];
  }, [totals]);

  const topTemplates = useMemo(() => {
    return [...templates].sort((a, b) => b.totalSubmissions - a.totalSubmissions).slice(0, 5);
  }, [templates]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Template Analytics</h1>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No templates yet. Create one to see analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Submissions", value: totals.submissions, icon: FileText, color: "text-primary" },
              { label: "Approval Rate", value: `${approvalRate}%`, icon: CheckCircle2, color: "text-success" },
              { label: "Avg Turnaround", value: totals.avgTurnaround !== null ? `${totals.avgTurnaround}d` : "—", icon: Clock, color: "text-warning" },
              { label: "Pending Review", value: totals.pending, icon: TrendingUp, color: "text-primary" },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <Card>
                  <CardContent className="pt-5 pb-4">
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

          {/* Conversion Funnel */}
          {funnelData.length > 0 && (
            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowDown className="h-4 w-4" /> Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4 py-4">
                    {funnelData.map((step, i) => {
                      const prevValue = i > 0 ? funnelData[i - 1].value : step.value;
                      const rate = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 0;
                      const widthPct = funnelData[0].value > 0 ? Math.max(30, (step.value / funnelData[0].value) * 100) : 100;
                      return (
                        <div key={step.name} className="flex flex-col items-center flex-1">
                          <div
                            className="rounded-lg py-4 px-3 text-center transition-all w-full"
                            style={{
                              backgroundColor: step.fill,
                              maxWidth: `${widthPct}%`,
                              minWidth: "80px",
                              opacity: 0.85 + (i === 0 ? 0.15 : 0),
                            }}
                          >
                            <p className="text-2xl font-bold text-white">{step.value}</p>
                          </div>
                          <p className="text-xs font-medium text-foreground mt-2">{step.name}</p>
                          {i > 0 && (
                            <p className="text-[10px] text-muted-foreground">{rate}% conversion</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Charts Row */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Submissions (Last 8 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {statusBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusBreakdown.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {statusBreakdown.map((s, idx) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          {s.name} ({s.value})
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8">No submissions yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Templates Table */}
          {!selected && topTemplates.length > 1 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Top Templates by Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topTemplates.map((t, i) => {
                      const convRate = t.totalSubmissions > 0 ? Math.round((t.approvedCount / t.totalSubmissions) * 100) : 0;
                      const reportRate = t.totalSubmissions > 0 ? Math.round((t.hasReportCount / t.totalSubmissions) * 100) : 0;
                      return (
                        <div key={t.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-muted-foreground font-mono w-4">{i + 1}</span>
                            <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                            {t.status === "archived" && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                            <span>{t.totalSubmissions} sub{t.totalSubmissions !== 1 ? "s" : ""}</span>
                            <span className="text-primary font-medium">{reportRate}% reported</span>
                            <span className="text-success font-medium">{convRate}% approved</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
