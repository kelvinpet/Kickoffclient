import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface ReminderLog {
  id: string;
  submission_id: string;
  client_name: string;
  client_email: string;
  reminder_type: string;
  sent_at: string;
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function ReminderLogPage() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    const fetchLogs = async () => {
      const { data } = await (supabase.from("reminder_logs" as any) as any)
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("sent_at", { ascending: false })
        .limit(100);
      setLogs((data as ReminderLog[]) || []);
      setLoading(false);
    };
    fetchLogs();
  }, [workspace]);

  if (wsLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const totalSent = logs.length;
  const uniqueClients = new Set(logs.map((l) => l.client_email)).size;
  const lastSent = logs[0]?.sent_at;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Reminder Activity Log</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div {...fadeUp}>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Reminders sent</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{uniqueClients}</p>
                <p className="text-xs text-muted-foreground">Unique clients reminded</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {lastSent ? format(new Date(lastSent), "MMM d, yyyy") : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Last reminder sent</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No reminders have been sent yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reminders are automatically sent to clients with pending kickoff packs after 3 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div key={log.id} {...fadeUp} transition={{ delay: i * 0.02 }}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.client_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {log.reminder_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.sent_at), "MMM d, h:mm a")}
                    </span>
                    <Link
                      to={`/app/submissions/${log.submission_id}`}
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      View
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
