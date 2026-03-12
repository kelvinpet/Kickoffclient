import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Send, Sparkles, CheckCircle, ArrowRight, Play, Pause,
  Clock, DollarSign, AlertTriangle, Target, BarChart3, Mail,
  User, Globe, Briefcase, Calendar, Loader2, Download, Copy,
} from "lucide-react";

const DEMO_STEPS = [
  {
    id: "intake",
    label: "Client Fills Intake",
    icon: FileText,
    description: "Your client opens a branded link and fills out a structured intake form — no login, no friction. Every field is tailored to capture exactly what you need.",
    duration: 7000,
  },
  {
    id: "ai",
    label: "AI Generates Report",
    icon: Sparkles,
    description: "KickoffClient's AI analyzes every answer and generates a complete, consultant-grade kickoff pack — scope docs, risk analysis, budget tiers, milestones, and a professional kickoff email.",
    duration: 8000,
  },
  {
    id: "portal",
    label: "Client Reviews in Portal",
    icon: Send,
    description: "Share a secure portal link. Your client reviews the full scope, leaves feedback on specific sections, and approves the project — all from one professional page.",
    duration: 6000,
  },
  {
    id: "kickoff",
    label: "Project Kicks Off",
    icon: CheckCircle,
    description: "Once approved, everything is locked — scope, contract, timeline. You're ready to start with full alignment, zero ambiguity.",
    duration: 5000,
  },
];

// Simulated intake form
const INTAKE_FIELDS = [
  { icon: User, label: "Full Name", value: "Sarah Mitchell", type: "text" },
  { icon: Briefcase, label: "Company", value: "Trakwise Inc.", type: "text" },
  { icon: Globe, label: "Project Goal", value: "Redesign our marketing website to improve conversion rates and modernize the brand experience", type: "textarea" },
  { icon: DollarSign, label: "Budget Range", value: "$8,000 – $15,000 USD", type: "select" },
  { icon: Calendar, label: "Ideal Timeline", value: "2–3 months", type: "select" },
  { icon: Target, label: "Key Pages", value: "Homepage, Pricing, About, Blog, Contact", type: "text" },
];

// Simulated AI report
const REPORT_SECTIONS = [
  {
    icon: Target, label: "Executive Summary", color: "text-primary",
    content: "A comprehensive website redesign targeting 40% improvement in conversion rates through mobile-first design, streamlined user journeys, and modern visual identity aligned with Trakwise's brand evolution.",
  },
  {
    icon: AlertTriangle, label: "Risk Analysis", color: "text-warning",
    content: "3 risks identified: (1) Scope creep from stakeholder feedback loops, (2) Timeline dependency on finalized brand guidelines, (3) Content migration complexity from legacy CMS.",
    items: ["Scope creep — mitigate with phased approval gates", "Brand asset delays — parallel track with placeholder designs", "CMS migration — allocate dedicated sprint"],
  },
  {
    icon: BarChart3, label: "Budget Breakdown", color: "text-primary",
    tiers: [
      { name: "MVP", price: "$8,200", desc: "Core 5 pages, responsive, basic animations" },
      { name: "Standard", price: "$11,500", desc: "All pages, CMS, SEO optimization, analytics" },
      { name: "Full", price: "$14,800", desc: "Everything + custom illustrations, A/B testing" },
    ],
  },
  {
    icon: Clock, label: "Timeline & Milestones", color: "text-accent-foreground",
    phases: [
      { name: "Discovery & Research", duration: "2 weeks", progress: 100 },
      { name: "Design & Prototyping", duration: "3 weeks", progress: 0 },
      { name: "Development", duration: "4 weeks", progress: 0 },
      { name: "QA & Launch", duration: "1 week", progress: 0 },
    ],
  },
  {
    icon: Mail, label: "Kickoff Email", color: "text-primary",
    content: "Hi Sarah,\n\nThank you for choosing us for your website redesign. I'm excited to share your project kickoff pack which includes our scope analysis, timeline, and budget recommendations.\n\nPlease review the attached portal link and let me know if you have any questions.\n\nBest regards",
  },
];

// Portal review sections
const PORTAL_SECTIONS = [
  { label: "Scope of Work", status: "approved" },
  { label: "Risk Mitigation Plan", status: "approved" },
  { label: "Budget (Standard Tier)", status: "approved" },
  { label: "Timeline & Milestones", status: "comment" },
];

function TypingText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <>{displayed}</>;
}

function IntakePreview() {
  const [filledIdx, setFilledIdx] = useState(-1);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFilledIdx((prev) => {
        if (prev >= INTAKE_FIELDS.length - 1) {
          clearInterval(interval);
          setTimeout(() => setSubmitted(true), 600);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {/* Fake form header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Website Redesign Intake</p>
            <p className="text-[10px] text-muted-foreground">Your Business · 6 questions</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">Live Form</Badge>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-1">
        <Progress value={Math.min(100, ((filledIdx + 1) / INTAKE_FIELDS.length) * 100)} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground font-medium">{Math.min(filledIdx + 1, INTAKE_FIELDS.length)}/{INTAKE_FIELDS.length}</span>
      </div>

      {/* Fields */}
      <div className="space-y-2.5 max-h-[250px] overflow-hidden">
        {INTAKE_FIELDS.map((field, i) => {
          const Icon = field.icon;
          const isFilled = i <= filledIdx;
          const isCurrent = i === filledIdx + 1;
          return (
            <motion.div
              key={field.label}
              initial={{ opacity: 0.3, y: 4 }}
              animate={{
                opacity: isFilled ? 1 : isCurrent ? 0.7 : 0.3,
                y: 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3" /> {field.label}
              </label>
              <div className={`rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                isFilled
                  ? "border-primary/40 bg-primary/5 text-foreground shadow-sm shadow-primary/5"
                  : isCurrent
                  ? "border-primary/20 bg-background animate-pulse"
                  : "border-border/50 bg-muted/20 text-muted-foreground/30"
              }`}>
                {isFilled ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="leading-relaxed">
                    {field.type === "textarea" ? (
                      <TypingText text={field.value} speed={15} />
                    ) : (
                      field.value
                    )}
                  </motion.span>
                ) : isCurrent ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse" /> Typing…
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Submit */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300 }}>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5 mt-1">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Submitted successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AIReportPreview() {
  const [visibleIdx, setVisibleIdx] = useState(-1);
  const [generating, setGenerating] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    const genTimer = setTimeout(() => {
      setGenerating(false);
      const interval = setInterval(() => {
        setVisibleIdx((prev) => {
          if (prev >= REPORT_SECTIONS.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
      return () => clearInterval(interval);
    }, 1500);
    return () => clearTimeout(genTimer);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Kickoff Pack</p>
            <p className="text-[10px] text-muted-foreground">
              {generating ? "Analyzing responses…" : "Generated in 12 seconds"}
            </p>
          </div>
        </div>
        {!generating && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      {generating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-8 gap-3"
        >
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">AI is analyzing client responses…</p>
          <Progress value={65} className="h-1 w-32" />
        </motion.div>
      )}

      {!generating && (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {REPORT_SECTIONS.map((section, i) => {
            const Icon = section.icon;
            const isVisible = i <= visibleIdx;
            const isExpanded = expandedIdx === i;
            return (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isVisible ? 1 : 0.1, x: isVisible ? 0 : -10 }}
                transition={{ duration: 0.35 }}
              >
                <button
                  onClick={() => isVisible && setExpandedIdx(isExpanded ? null : i)}
                  className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                    isExpanded
                      ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/5"
                      : "border-border/60 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${section.color}`} />
                    </div>
                    <p className="text-[11px] font-semibold text-foreground flex-1">{section.label}</p>
                    {isVisible && (
                      <Badge variant="outline" className="text-[8px] bg-primary/5 text-primary border-primary/15">
                        AI
                      </Badge>
                    )}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 pl-9"
                      >
                        {section.content && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{section.content}</p>
                        )}
                        {section.items && (
                          <ul className="space-y-1 mt-1">
                            {section.items.map((item, j) => (
                              <li key={j} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                                <AlertTriangle className="h-2.5 w-2.5 text-warning mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.tiers && (
                          <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {section.tiers.map((tier) => (
                              <div key={tier.name} className={`rounded-md border p-2 text-center ${tier.name === "Standard" ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
                                <p className="text-[10px] font-bold text-foreground">{tier.name}</p>
                                <p className="text-xs font-semibold text-primary">{tier.price}</p>
                                <p className="text-[8px] text-muted-foreground mt-0.5">{tier.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.phases && (
                          <div className="space-y-1.5 mt-1">
                            {section.phases.map((phase) => (
                              <div key={phase.name} className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-[10px] text-foreground font-medium">{phase.name}</p>
                                  <p className="text-[8px] text-muted-foreground">{phase.duration}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PortalPreview() {
  const [reviewIdx, setReviewIdx] = useState(-1);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setReviewIdx((prev) => {
        if (prev >= PORTAL_SECTIONS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <Send className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Client Portal</p>
            <p className="text-[10px] text-muted-foreground">Sarah Mitchell • Trakwise Inc.</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px]">Secure Link</Badge>
      </div>

      {/* Project summary card */}
      <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground">Website Redesign — Standard Tier</p>
          <Badge className="text-[8px] bg-primary/10 text-primary border-0">$11,500</Badge>
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 10 weeks</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> 4 phases</span>
          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> 5 deliverables</span>
        </div>
      </div>

      {/* Section reviews */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Section Review</p>
        {PORTAL_SECTIONS.map((section, i) => {
          const isReviewed = i <= reviewIdx;
          return (
            <motion.div
              key={section.label}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: isReviewed ? 1 : 0.3 }}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2"
            >
              <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                isReviewed
                  ? section.status === "approved"
                    ? "bg-primary text-primary-foreground"
                    : "bg-warning text-warning-foreground"
                  : "border-2 border-border"
              }`}>
                {isReviewed && <CheckCircle className="h-3 w-3" />}
              </div>
              <span className="text-[11px] font-medium text-foreground flex-1">{section.label}</span>
              {isReviewed && (
                <Badge variant="outline" className={`text-[8px] ${
                  section.status === "approved"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-warning/10 text-warning border-warning/20"
                }`}>
                  {section.status === "approved" ? "Approved" : "Has comment"}
                </Badge>
              )}
            </motion.div>
          );
        })}
      </div>

      {reviewIdx >= PORTAL_SECTIONS.length - 1 && !approved && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
          <Button size="sm" className="w-full text-xs h-9 font-semibold" onClick={() => setApproved(true)}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve & Lock Scope
          </Button>
        </motion.div>
      )}

      {approved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center"
        >
          <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-semibold text-primary">Scope Approved!</p>
          <p className="text-[10px] text-muted-foreground">Contract generated • Deposit invoice sent</p>
        </motion.div>
      )}
    </div>
  );
}

function KickoffPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => Math.min(prev + 1, 3));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { icon: FileText, label: "Scope of Work", desc: "Locked & signed by client" },
    { icon: DollarSign, label: "Deposit Received", desc: "$3,450 via Flutterwave" },
    { icon: Mail, label: "Kickoff Email Sent", desc: "Professional intro with next steps" },
    { icon: Calendar, label: "Phase 1 Begins", desc: "Discovery & Research — 2 weeks" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
          <CheckCircle className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Project Ready to Start 🎉</p>
          <p className="text-[10px] text-muted-foreground">Everything aligned, documented, and paid</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = i <= step;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isActive ? 1 : 0.2, x: isActive ? 0 : -10 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted border border-border"
              }`}>
                {isActive ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {step >= 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-center text-muted-foreground pt-1"
        >
          From first contact to project start — <span className="text-primary font-semibold">fully automated</span>.
        </motion.p>
      )}
    </div>
  );
}

const STEP_COMPONENTS: Record<string, React.FC> = {
  intake: IntakePreview,
  ai: AIReportPreview,
  portal: PortalPreview,
  kickoff: KickoffPreview,
};

export default function InteractiveDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentDuration = DEMO_STEPS[activeStep].duration;

  useEffect(() => {
    if (!autoPlay) { setProgress(0); return; }
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / (currentDuration / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [activeStep, autoPlay, currentDuration]);

  useEffect(() => {
    if (!autoPlay || progress < 100) return;
    if (activeStep < DEMO_STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      setAutoPlay(false);
    }
  }, [progress, autoPlay, activeStep]);

  const handleStepClick = useCallback((i: number) => {
    setActiveStep(i);
    setAutoPlay(false);
  }, []);

  const StepComponent = STEP_COMPONENTS[DEMO_STEPS[activeStep].id];

  return (
    <section className="py-28 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <Badge variant="outline" className="mb-4 text-xs bg-primary/5 text-primary border-primary/20">
            <Play className="h-3 w-3 mr-1" /> Interactive Preview
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">See It in Action</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Walk through the entire client onboarding flow — from intake to project kickoff — right here.
          </p>
          <Button
            variant={autoPlay ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (autoPlay) {
                setAutoPlay(false);
              } else {
                setActiveStep(0);
                setAutoPlay(true);
              }
            }}
            className="gap-2"
          >
            {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {autoPlay ? "Pause" : "Auto-play demo"}
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* Step selector */}
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
            {DEMO_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(i)}
                  className={`relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-300 whitespace-nowrap md:whitespace-normal min-w-[220px] md:min-w-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                      : isDone
                      ? "bg-primary/5 border border-primary/20 text-foreground"
                      : "bg-card border border-border hover:border-primary/30 text-foreground"
                  }`}
                >
                  {/* Progress bar for autoplay */}
                  {isActive && autoPlay && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
                      <div
                        className="h-full bg-primary-foreground/30 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? "bg-primary-foreground/20"
                      : isDone
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}>
                    {isDone ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                    )}
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      Step {i + 1}
                    </p>
                    <p className={`text-xs font-semibold ${isActive ? "" : "text-foreground"}`}>
                      {step.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Demo preview */}
          <Card className="overflow-hidden border-border/50 shadow-2xl shadow-primary/5">
            <CardContent className="p-0">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/30" />
                <div className="flex-1 mx-3 h-7 rounded-lg bg-background border border-border flex items-center px-3">
                  <Globe className="h-3 w-3 text-muted-foreground/50 mr-1.5" />
                  <span className="text-[10px] text-muted-foreground">{APP_NAME.toLowerCase()}.com/t/trakwise-redesign</span>
                </div>
              </div>
              <div className="p-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p className="text-xs text-muted-foreground mb-5 leading-relaxed max-w-md">
                      {DEMO_STEPS[activeStep].description}
                    </p>
                    <StepComponent />
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
