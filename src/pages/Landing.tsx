import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InteractiveDemo from "@/components/InteractiveDemo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, CheckCircle, ArrowRight, Moon, Sun, FileText, Sparkles, Send, Users, Briefcase, Code, BarChart3, X, Check, Shield, Lock, ChevronDown, ClipboardCheck, Receipt, Rocket } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { motion } from "framer-motion";
import { useState } from "react";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { pricingPlans } from "@/data/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } }),
};

const features = [
  "AI-generated kickoff packs",
  "Custom intake form templates",
  "Shareable client links",
  "Summary, risks, timeline & milestones",
  "Digital client approval & contracts",
  "Secure payments via Flutterwave",
];

const steps = [
  { icon: FileText, title: "Build Your Intake Form", desc: "Create custom templates with the fields that matter — budget, timeline, goals, file uploads." },
  { icon: Send, title: "Share With Your Client", desc: "Send a branded link. Clients fill it out in minutes — no login, no friction." },
  { icon: Sparkles, title: "Get a Consultant-Grade Kickoff Pack", desc: "AI generates scope docs, risk analysis, budget recommendations, and a professional kickoff email." },
];

const audiences = [
  { icon: Users, title: "Freelancers", desc: "Stop writing proposals from scratch. Impress clients from the first interaction." },
  { icon: Briefcase, title: "Agencies", desc: "Standardize onboarding across your team. Scale without losing quality." },
  { icon: Code, title: "Product Teams", desc: "Capture requirements clearly. Align stakeholders before a single line of code." },
];

const problems = [
  { bad: "Scattered intake across email, Slack, and calls", good: "One structured form captures everything" },
  { bad: "Hours writing scope docs and risk assessments", good: "AI generates consultant-grade packs in seconds" },
  { bad: "Clients ghosting after vague kickoff calls", good: "Professional portal keeps clients engaged and accountable" },
  { bad: "Undercharging because scope wasn't clear", good: "Budget analysis with MVP, Standard, and Full tiers" },
];

const pipelineSteps = [
  { icon: FileText, label: "Client Intake" },
  { icon: Sparkles, label: "AI Proposal" },
  { icon: ClipboardCheck, label: "Client Approval" },
  { icon: Receipt, label: "Contract & Deposit" },
  { icon: Rocket, label: "Project Starts" },
];

const faqs = [
  { q: "What is included in a kickoff pack?", a: "Every pack includes an executive summary, problem diagnosis, solution blueprint, detailed scope of work, risk analysis, milestone plan, budget recommendations, timeline options, and a professional kickoff email — all tailored to your project." },
  { q: "Can I edit the generated report?", a: "Yes. You can regenerate reports with different modes (detailed or proposal-ready), copy any section to your clipboard, and export to PDF on the Pro plan." },
  { q: "Can clients approve scope digitally?", a: "Absolutely. Every submission generates a secure portal link. Clients can review the full kickoff pack, approve scope, receive a contract, and pay a deposit — all from one link." },
  { q: "What happens on the Free plan?", a: "You get up to 2 submissions per month with full AI-generated kickoff packs. Upgrade to Pro for unlimited submissions, PDF export, and custom branding." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted in transit and at rest. Payment processing is handled securely by Flutterwave. We never share your client data with third parties." },
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">KickoffClient</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Link to="/pricing" className="hidden sm:block">
            <Button variant="ghost" size="sm">Pricing</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Sign up <ArrowRight className="h-4 w-4 ml-1 hidden sm:inline" /></Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" /> End-to-End Client Onboarding
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight"
        >
          From client brief to project start<br />
          <span className="text-primary">in one seamless workflow.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          KickoffClient handles intake, AI-powered proposals, client approval, contracts, and deposit collection — so you can start projects faster with zero back-and-forth.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col items-center gap-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8 h-12 font-semibold w-full sm:w-auto">
                Generate Your First Kickoff Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="text-base px-8 h-12 w-full sm:w-auto">View pricing</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">No credit card required · Secure payments via Flutterwave</p>
        </motion.div>

        {/* Hero Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-12 mb-4 relative"
        >
          <div className="rounded-xl border border-border/60 shadow-2xl shadow-primary/10 overflow-hidden bg-card">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border/40">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="text-[10px] text-muted-foreground ml-2 font-mono">kickoffclient.com/app</span>
            </div>
            <img
              src={dashboardMockup}
              alt="KickoffClient dashboard showing client submissions, analytics charts, and template management"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left mt-12"
        >
          {features.map((f, i) => (
            <motion.div key={f} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-3 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              {f}
            </motion.div>
          ))}
        </motion.div>

        {/* Pricing section */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
                  <Link to="/pricing">
                    <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Pipeline Section */}
      <section className="border-t border-border py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Your Complete Client Pipeline</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">From first contact to project kickoff — automated, professional, and effortless.</p>
          </motion.div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            {pipelineSteps.map((step, i) => (
              <motion.div
                key={step.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-3 md:flex-col md:gap-2 md:text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{step.label}</span>
                {i < pipelineSteps.length - 1 && (
                  <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground/50 absolute" style={{ display: "none" }} />
                )}
              </motion.div>
            ))}
          </div>
          {/* Connecting arrows for desktop */}
          <div className="hidden md:flex justify-between items-center max-w-3xl mx-auto -mt-8 px-12">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex-1 flex items-center justify-center">
                <div className="w-full h-px bg-border relative">
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 absolute right-0 -top-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Three steps from chaos to clarity. No training needed.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div key={step.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <CardContent className="pt-8 pb-6 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
                      <step.icon className="h-7 w-7" />
                    </div>
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Step {i + 1}</div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <InteractiveDemo />

      {/* Who It's For */}
      <section className="py-28 px-6 bg-accent/30">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for People Who Ship</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Whether you're solo or scaling a team, KickoffClient adapts to how you work.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {audiences.map((a, i) => (
              <motion.div key={a.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="pt-8 pb-6 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                      <a.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="border-t border-border py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">The Old Way vs. The KickoffClient Way</h2>
          </motion.div>
          <div className="space-y-4">
            {problems.map((p, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 rounded-lg bg-destructive/5 border border-destructive/10 p-4">
                    <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{p.bad}</span>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-4">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{p.good}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-28 px-6 bg-accent/30">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left"
                >
                  <Card className={`transition-all duration-200 ${openFaq === i ? "border-primary/30 shadow-md shadow-primary/5" : "hover:border-primary/20"}`}>
                    <CardContent className="py-5 px-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground leading-snug">{faq.q}</h3>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${openFaq === i ? "rotate-180" : ""}`} />
                      </div>
                      {openFaq === i && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-sm text-muted-foreground mt-3 leading-relaxed"
                        >
                          {faq.a}
                        </motion.p>
                      )}
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <BarChart3 className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to upgrade your client onboarding?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join freelancers and agencies who close projects faster with AI-powered kickoff packs.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="text-base px-10 h-12 font-semibold">
                  Start for free <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">No credit card required</p>
            </div>

            {/* Trust elements */}
            <div className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Secure payments via Flutterwave</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Your data stays private</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground space-y-2">
        <div className="flex justify-center gap-6">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
        </div>
        <p>© {new Date().getFullYear()} KickoffClient. All rights reserved.</p>
      </footer>
    </div>
  );
}
