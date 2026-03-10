import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, CheckCircle, Clock, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

interface AnalyticsData {
  totalSubmissions: number;
  approvalRate: number;
  avgTurnaroundDays: number | null;
  uniqueClients: number;
  weeklyTrend: { week: string; count: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  prevMonthTotal: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35, ease: [0, 0, 0.2, 1] as const } }),
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(142 71% 45%)"];

export default function DashboardAnalytics() {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    fetchAnalytics();
  }, [workspace]);

  const fetchAnalytics = async () => {
    if (!workspace) return;
    setLoading(true);

    const { data: allSubs } = await supabase
      .from("submissions")
      .select("id, status, created_at, approved_at, client_email, templates!inner(workspace_id)")
      .eq("templates.workspace_id", workspace.id);

    const subs = allSubs || [];
    const total = subs.length;
    const approved = subs.filter((s) => ["approved", "scope_locked", "project_started"].includes(s.status)).length;
    const pending = subs.filter((s) => s.status === "pending").length;
    const needsChanges = subs.filter((s) => s.status === "needs_changes").length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Average turnaround
    const withApproval = subs.filter((s) => s.approved_at);
    let avgDays: number | null = null;
    if (withApproval.length > 0) {
      const totalMs = withApproval.reduce((sum, s) => {
        return sum + (new Date(s.approved_at!).getTime() - new Date(s.created_at).getTime());
      }, 0);
      avgDays = Math.round((totalMs / withApproval.length) / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    // Unique clients
    const uniqueEmails = new Set(subs.map((s) => s.client_email));

    // Previous month count for trend
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthTotal = subs.filter((s) => {
      const d = new Date(s.created_at);
      return d >= prevMonthStart && d < thisMonthStart;
    }).length;

    // Weekly trend (last 8 weeks)
    const weeks: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const count = subs.filter((s) => {
        const d = new Date(s.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({
        week: weekStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
        count,
      });
    }

    // Status breakdown
    const statusBreakdown = [
      { name: "Approved", value: approved, color: PIE_COLORS[0] },
      { name: "Pending", value: pending, color: PIE_COLORS[1] },
      { name: "Changes", value: needsChanges, color: PIE_COLORS[2] },
    ].filter((s) => s.value > 0);

    setData({
      totalSubmissions: total,
      approvalRate,
      avgTurnaroundDays: avgDays,
      uniqueClients: uniqueEmails.size,
      weeklyTrend: weeks,
      statusBreakdown,
      prevMonthTotal,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonthTotal = data.weeklyTrend.reduce((s, w) => s + w.count, 0);
  const trendUp = thisMonthTotal >= data.prevMonthTotal;

  const stats = [
    { label: "Total Submissions", value: data.totalSubmissions, icon: TrendingUp, color: "text-primary", trend: trendUp },
    { label: "Approval Rate", value: `${data.approvalRate}%`, icon: CheckCircle, color: "text-success" },
    { label: "Avg. Turnaround", value: data.avgTurnaroundDays !== null ? `${data.avgTurnaroundDays}d` : "—", icon: Clock, color: "text-warning" },
    { label: "Unique Clients", value: data.uniqueClients, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  {stat.trend !== undefined && data.totalSubmissions > 0 && (
                    <span className={`text-[10px] flex items-center gap-0.5 mb-1 ${stat.trend ? "text-success" : "text-destructive"}`}>
                      {stat.trend ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      vs last month
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="md:col-span-2">
          <Card className="hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Submission Trends (Last 8 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {data.statusBreakdown.length > 0 && (
          <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                      >
                        {data.statusBreakdown.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {data.statusBreakdown.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
