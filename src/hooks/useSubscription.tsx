import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

export interface Subscription {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  provider: string;
  plan: string;
  status: string;
  billing_cycle?: string | null;
  amount?: number | null;
  currency?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  expires_at?: string | null;
  renewed_at?: string | null;
  canceled_at?: string | null;
  tx_ref?: string | null;
  transaction_id?: string | null;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!workspace) { setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions" as any)
      .select("*")
      .eq("workspace_id", workspace.id)
      .single() as any;

    let sub: Subscription | null = data as Subscription | null;

    if (!sub) {
      // Create default free subscription if none exists
      const { data: existingSubscription } = await supabase
        .from("subscriptions" as any)
        .select("workspace_id")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      if (!existingSubscription) {
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions" as any)
          .insert({
            workspace_id: workspace.id,
            provider: "flutterwave",
            plan: "free",
            status: "expired",
          })
          .select()
          .single();

        if (!insertError && newSub) {
          sub = newSub as Subscription;
        }
      }
    }

    if (sub && sub.expires_at) {
      const now = new Date();
      if (new Date(sub.expires_at) < now && sub.status !== "expired") {
        // automatically downgrade expired subscription
        await supabase
          .from("subscriptions" as any)
          .update({ plan: "free", status: "expired" })
          .eq("id", sub.id);
        sub = { ...sub, plan: "free", status: "expired" };

        // also downgrade workspace plan
        await supabase
          .from("workspaces")
          .update({ plan: "free" })
          .eq("id", workspace.id);
        // refetch workspace to update local state
        refetchWorkspace();
      }
    }

    setSubscription(sub);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [workspace]);

  // Compute effective plan: must be pro, active, and unexpired
  const now = Date.now();
  const isPro =
    subscription?.plan === "pro" &&
    subscription?.status === "active" &&
    subscription?.current_period_end &&
    new Date(subscription.current_period_end).getTime() > now;

  const effectivePlan = isPro ? "pro" : "free";

  return { subscription, loading, isPro, effectivePlan, refetch: fetchSubscription };
}
