import AuthNavbar from "@/components/AuthNavbar";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect account information (name, email), workspace data, client intake form responses, and usage analytics.</p>
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Information</h2>
          <p>Your data is used to provide the KickoffClient service, generate AI reports, process payments, and improve our product.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Data Storage</h2>
          <p>All data is stored securely using industry-standard encryption. Client submissions and files are stored in secure cloud storage.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
          <p>We use Flutterwave for payment processing and AI services for report generation. These services have their own privacy policies.</p>
          <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
          <p>You can request access to, correction of, or deletion of your personal data by contacting us.</p>
        </div>
      </main>
    </div>
  );
}
