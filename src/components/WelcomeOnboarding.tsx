import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, Send, Rocket, ArrowRight, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Create Your First Template",
    desc: "Build an intake form with the fields that matter — budget, timeline, goals, and file uploads.",
    action: "Create Template",
    route: "/app/templates/new",
  },
  {
    icon: Send,
    title: "Share With Your Client",
    desc: "Copy your branded link and send it. Clients fill it out in minutes — no login needed.",
  },
  {
    icon: Sparkles,
    title: "Get AI Kickoff Packs",
    desc: "AI generates scope docs, risk analysis, budget tiers, milestones, and a professional kickoff email.",
  },
  {
    icon: Rocket,
    title: "Close & Start Projects",
    desc: "Clients approve scope, sign contracts, and pay deposits — all from one portal link.",
  },
];

export default function WelcomeOnboarding({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Welcome to KickoffClient 🎉</h2>
              <p className="text-sm text-muted-foreground">Here's how to get started in 4 simple steps</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-xs text-muted-foreground">
              Dismiss
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-border"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="h-6 w-6" />;
                })()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Step {currentStep + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{steps[currentStep].title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{steps[currentStep].desc}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="text-xs"
            >
              Back
            </Button>
            <div className="flex gap-2">
              {steps[currentStep].route ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onDismiss();
                    navigate(steps[currentStep].route!);
                  }}
                >
                  {steps[currentStep].action} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : currentStep < steps.length - 1 ? (
                <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)}>
                  Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={onDismiss}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Got it, let's go!
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
