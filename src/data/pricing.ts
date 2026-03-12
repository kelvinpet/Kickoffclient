export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: "free" | "pro";
  name: string;
  price: string;
  monthlyLabel?: string; // e.g. "/mo"
  features: string[];
  popular?: boolean;
  cta: string;
}

// shared source of truth for plan data
export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    monthlyLabel: "",
    features: [
      "2 submissions/month",
      "AI kickoff pack generation",
      "Shareable intake links",
      "Basic templates",
    ],
    cta: "Get started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    monthlyLabel: "/mo",
    features: [
      "Unlimited submissions",
      "AI kickoff pack generation",
      "Shareable intake links",
      "Unlimited templates",
      "Editable proposals",
      "Proposal version control",
      "Client approval tracking",
      "PDF export",
      "File attachments",
      "Custom branding",
      "Priority AI generation",
    ],
    popular: true,
    cta: "Upgrade to Pro",
  },
];