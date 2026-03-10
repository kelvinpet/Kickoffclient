import AuthNavbar from "@/components/AuthNavbar";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By using KickoffClient, you agree to these terms of service. If you do not agree, please do not use our service.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
          <p>KickoffClient provides AI-powered client onboarding tools including intake forms, kickoff pack generation, and project planning assistance.</p>
          <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Subscriptions & Billing</h2>
          <p>Pro subscriptions are billed monthly. You can cancel at any time. Refunds are subject to our refund policy.</p>
          <h2 className="text-lg font-semibold text-foreground">5. Data Privacy</h2>
          <p>We handle your data in accordance with our Privacy Policy. Client data submitted through intake forms is stored securely.</p>
          <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
          <p>KickoffClient is provided "as is" without warranties. We are not liable for any indirect or consequential damages.</p>
        </div>
      </main>
    </div>
  );
}
