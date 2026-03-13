import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2, CheckCircle } from "lucide-react";

import { pricingPlans } from "@/data/pricing";


export default function Billing() {
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { subscription, isPro, effectivePlan, refetch: refetchSubscription } = useSubscription();
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();


  const handleUpgrade = async () => {
    if (!workspace || !user) return;
    setInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke("flutterwave-checkout", {
        body: { 
          email: user.email, 
          user_id: user.id, 
          workspace_id: workspace.id,
          redirect_base: window.location.origin 
        },
      });
      if (error) {
        // include error from response body if present
        const msg = error.message || "Edge function error";
        const detail = data?.error ? `: ${data.error}` : "";
        throw new Error(msg + detail);
      }
      if (data?.payment_link) {
        window.location.href = data.payment_link;
      } else {
        throw new Error("No payment link returned." + (data?.error ? ` ${data.error}` : ""));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to initialize payment", variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={effectivePlan === "pro" ? "default" : "secondary"} className="text-sm">
              {effectivePlan === "pro" ? "Pro" : "Free"}
            </Badge>
            {effectivePlan === "pro" && <CheckCircle className="h-4 w-4 text-success" />}
          </div>

          {subscription && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Status: <span className="text-foreground capitalize">
                {effectivePlan === "pro" ? "Active" :
                  (subscription?.current_period_end && new Date(subscription.current_period_end).getTime() < Date.now()) ? "Expired" : "Free"}
              </span></p>
              {effectivePlan === "pro" && subscription.current_period_end && (
                <p>Access expires: <span className="text-foreground">{new Date(subscription.current_period_end).toLocaleString()}</span></p>
              )}
              {effectivePlan !== "pro" && (
                <p>Upgrade to regain Pro access.</p>
              )}
            </div>
          )}

          {effectivePlan !== "pro" && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3">
                If your Pro access expires, you can upgrade again anytime.
              </p>
              <Button onClick={handleUpgrade} disabled={initializing} className="w-full">
                {initializing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initializing…</>
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className="space-y-2">
                <p className="font-medium text-foreground capitalize">{plan.name}</p>
                <ul className="space-y-1 text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
