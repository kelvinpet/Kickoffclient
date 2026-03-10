import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

export interface Subscription {
  id: string;
  workspace_id: string;
  provider: string;
  plan: string;
  status: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_email_token: string | null;
  paystack_plan_code: string | null;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { workspace } = useWorkspace();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!workspace) { setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions" as any)
      .select("*")
      .eq("workspace_id", workspace.id)
      .single() as any;
    setSubscription(data as Subscription | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [workspace]);

  const isPro = (workspace as any)?.plan === "pro" || subscription?.status === "active";

  return { subscription, loading, isPro, refetch: fetchSubscription };
}
