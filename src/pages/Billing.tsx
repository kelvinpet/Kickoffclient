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
  const { subscription, isPro, refetch: refetchSubscription } = useSubscription();
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
            <Badge variant={isPro ? "default" : "secondary"} className="text-sm">
              {isPro ? "Pro" : "Free"}
            </Badge>
            {isPro && <CheckCircle className="h-4 w-4 text-success" />}
          </div>

          {subscription && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Status: <span className="text-foreground capitalize">{subscription.status}</span></p>
              {subscription.expires_at && (
                <p>Expires: <span className="text-foreground">{new Date(subscription.expires_at).toLocaleDateString()}</span></p>
              )}
              {subscription.current_period_end && (
                <p>Period end: <span className="text-foreground">{new Date(subscription.current_period_end).toLocaleDateString()}</span></p>
              )}
              {subscription.next_payment_date && (
                <p>Next payment: <span className="text-foreground">{new Date(subscription.next_payment_date).toLocaleDateString()}</span></p>
              )}
            </div>
          )}

          {!isPro && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to Pro for $19/month — unlimited submissions, PDF export, and custom branding.
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

          {isPro && (
            <>
              <p className="text-sm text-muted-foreground">
                Your subscription is active. Contact support to make changes or use
                the button below to cancel.
              </p>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from("subscriptions")
                      .update({ status: "canceled", canceled_at: new Date().toISOString() })
                      .eq("workspace_id", workspace?.id);
                    if (error) throw error;
                    toast({ title: "Canceled", description: "Your subscription was canceled and will remain active until the end of the current period." });
                    refetchSubscription();
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message || "Unable to cancel", variant: "destructive" });
                  }
                }}
                className="mt-2 px-4 py-2 border border-destructive text-destructive rounded"
              >
                Cancel subscription
              </button>
            </>
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
