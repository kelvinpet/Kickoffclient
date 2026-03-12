import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    const tx_ref = searchParams.get("tx_ref");
    const transaction_id = searchParams.get("transaction_id");

    async function verify() {
      try {
        const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
          body: { status, tx_ref, transaction_id },
        });
        if (error) throw error;
        if (data?.success) {
          setResult("success");
          toast({ title: "Payment confirmed", description: "Your subscription is now Pro." });
          // automatically redirect back to billing after a short delay
          setTimeout(() => {
            navigate("/app/billing", { replace: true });
          }, 2000);
        } else {
          setResult("failed");
          toast({ title: "Verification failed", description: data?.status || "Could not confirm payment", variant: "destructive" });
        }
      } catch (err: any) {
        setResult("failed");
        toast({ title: "Verification error", description: err.message || "Unexpected error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [searchParams, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      {result === "success" ? (
        <>
          <CheckCircle className="h-16 w-16 text-success" />
          <h1 className="text-2xl font-bold">Subscription upgraded!</h1>
          <button
            onClick={() => navigate("/app/billing")}
            className="mt-4 px-6 py-2 bg-primary text-white rounded"
          >
            Go to billing
          </button>
        </>
      ) : (
        <>
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Payment could not be verified</h1>
          <p className="text-sm text-muted-foreground">If you were charged, contact support.</p>
        </>
      )}
    </div>
  );
}