import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Zap, ArrowLeft } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: [
      { text: "2 submissions/month", included: true },
      { text: "AI kickoff pack generation", included: true },
      { text: "Shareable intake links", included: true },
      { text: "Basic templates", included: true },
      { text: "Unlimited templates", included: false },
      { text: "Editable proposals", included: false },
      { text: "Proposal version control", included: false },
      { text: "Client approval tracking", included: false },
      { text: "PDF export", included: false },
      { text: "File attachments", included: false },
      { text: "Custom branding", included: false },
    ],
    cta: "Get started",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$19/mo",
    features: [
      { text: "Unlimited submissions", included: true },
      { text: "AI kickoff pack generation", included: true },
      { text: "Shareable intake links", included: true },
      { text: "Unlimited templates", included: true },
      { text: "Editable proposals", included: true },
      { text: "Proposal version control", included: true },
      { text: "Client approval tracking", included: true },
      { text: "PDF export", included: true },
      { text: "File attachments", included: true },
      { text: "Custom branding", included: true },
      { text: "Priority AI generation", included: true },
    ],
    cta: "Upgrade to Pro",
    variant: "default" as const,
  },
];

export default function Pricing() {
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
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.name === "Pro" ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-3xl font-bold text-foreground">{plan.price}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-2 text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {f.included ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button variant={plan.variant} className="w-full">{plan.cta}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
