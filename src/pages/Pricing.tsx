import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { pricingPlans } from "@/data/pricing";

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { workspace } = useWorkspace();

  const handleProClick = async () => {
    if (!user || !workspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("flutterwave-checkout", {
        body: {
          email: user.email,
          user_id: user.id,
          workspace_id: workspace.id,
          redirect_base: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.payment_link) {
        window.location.href = data.payment_link;
      } else {
        throw new Error("No payment link returned");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Unable to start checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-4 max-w-6xl mx-auto">
        <Link to="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">KickoffClient</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-center mb-2 text-foreground">Simple pricing</h1>
        <p className="text-center text-muted-foreground mb-12">Start free, upgrade when you need more.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={plan.id === "pro" ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-3xl font-bold text-foreground">
                  {plan.price}{plan.monthlyLabel || ""}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.id === "pro" && user ? (
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={handleProClick}
                    disabled={loading}
                  >
                    {loading ? "Please wait…" : plan.cta}
                  </Button>
                ) : (
                  <Link to="/signup">
                    <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
