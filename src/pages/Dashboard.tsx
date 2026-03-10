import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Inbox, ArrowRight, Sparkles, Zap, LayoutTemplate } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35, ease: [0, 0, 0.2, 1] as const } }),
};

export default function Dashboard() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const name = data?.name || user.user_metadata?.name || "";
        setFirstName(name.split(" ")[0]);
      });
  }, [user]);

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("templates")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) => {
          setTemplates(data || []);
          // Show onboarding if user has no templates yet
          if ((data || []).length === 0) {
            const dismissed = localStorage.getItem(`onboarding_dismissed_${workspace.id}`);
            if (!dismissed) setShowOnboarding(true);
          }
        }),
      supabase
        .from("submissions")
        .select("*, templates!inner(workspace_id, title)")
        .eq("templates.workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) => setSubmissions(data || [])),
    ]).finally(() => setLoading(false));
  }, [workspace]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (workspace) localStorage.setItem(`onboarding_dismissed_${workspace.id}`, "true");
  };

  if (wsLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pt-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{firstName ? `Welcome, ${firstName} 👋` : "Welcome 👋"}</p>
        </div>
      </motion.div>

      {/* Welcome Onboarding */}
      <AnimatePresence>
        {showOnboarding && <WelcomeOnboarding onDismiss={dismissOnboarding} />}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: "/app/templates/new", icon: Plus, label: "Create Template", desc: "Build a new intake form", color: "bg-primary/10 text-primary" },
          { to: "/app/submissions", icon: Inbox, label: "View Submissions", desc: "See client responses", color: "bg-accent text-accent-foreground" },
          { to: "/app/billing", icon: Sparkles, label: isPro ? "Pro Plan Active" : "Upgrade to Pro", desc: isPro ? "Manage your subscription" : "Unlock premium features", color: "bg-warning/10 text-warning" },
        ].map((action, i) => (
          <motion.div key={action.to} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <Link to={action.to}>
          <Card className="group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`p-2.5 rounded-lg ${action.color} transition-transform duration-300 group-hover:scale-110`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Analytics */}
      <DashboardAnalytics />

      {/* Templates + Submissions */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-primary" /> Templates
              </CardTitle>
              <Link to="/app/templates" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-6">
                  <LayoutTemplate className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No templates yet</p>
                  <Link to="/app/templates/new">
                    <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Create your first</Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/app/templates/${t.id}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/50"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="h-full hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" /> Recent Submissions
              </CardTitle>
              <Link to="/app/submissions" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-6">
                  <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No submissions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Share a template to start receiving responses</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {submissions.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/app/submissions/${s.id}`}
                        className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <span className="font-medium text-foreground truncate">{s.client_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{s.client_email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
