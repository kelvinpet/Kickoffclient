import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";

export default function Billing() {
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { subscription, isPro, refetch: refetchSubscription } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initializing, setInitializing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const verifiedRef = useRef(false);

  // Verify payment on redirect from Paystack
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const isPaystackRedirect = searchParams.get("paystack") === "1" || reference;

    if (reference && !verifiedRef.current) {
      verifiedRef.current = true;
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Subscription activated!", description: "Your plan has been upgraded to Pro." });
        // Clean URL params
        setSearchParams({});
        // Refetch data
        await Promise.all([refetchWorkspace(), refetchSubscription()]);
      } else {
        toast({ title: "Verification issue", description: "Payment may still be processing. Please refresh in a moment.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Could not verify payment", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleUpgrade = async () => {
    if (!workspace) return;
    setInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { workspace_id: workspace.id },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast({ title: "Error", description: "No checkout URL returned. Please configure Paystack in Settings first.", variant: "destructive" });
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

      {verifying && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying your payment…</p>
          </CardContent>
        </Card>
      )}

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
              <Button onClick={handleUpgrade} disabled={initializing || verifying} className="w-full">
                {initializing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initializing…</>
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            </div>
          )}

          {isPro && (
            <p className="text-sm text-muted-foreground">
              To manage your subscription, visit your Paystack dashboard or contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Free</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 2 submissions/month</li>
                <li>• AI kickoff packs</li>
                <li>• Unlimited templates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Pro</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Unlimited submissions</li>
                <li>• PDF export</li>
                <li>• Custom branding</li>
                <li>• Priority generation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
