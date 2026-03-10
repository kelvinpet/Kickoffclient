import AuthNavbar from "@/components/AuthNavbar";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-6">Refund Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-lg font-semibold text-foreground">1. Subscription Refunds</h2>
          <p>If you are not satisfied with KickoffClient Pro, you may request a refund within 7 days of your initial subscription payment.</p>
          <h2 className="text-lg font-semibold text-foreground">2. How to Request a Refund</h2>
          <p>Contact our support team with your account email and reason for the refund request. We will process eligible refunds within 5-10 business days.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Cancellation</h2>
          <p>You can cancel your Pro subscription at any time. Your Pro features will remain active until the end of your current billing period.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Non-Refundable</h2>
          <p>Refunds are not available for partial months or after the 7-day refund window has passed.</p>
        </div>
      </main>
    </div>
  );
}
