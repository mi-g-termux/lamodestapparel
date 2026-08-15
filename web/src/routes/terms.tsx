import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/terms")({
  head: () => pageMeta("Terms of Service", "The terms that apply when you buy from Velora."),
  component: TermsPage,
});

function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      body="The agreement between you and Velora Studio Ltd."
      sections={[{"title": "Orders", "body": "An order is accepted when we send the confirmation email. Until then we may decline it, for example if a piece has sold out or a price was listed in error."}, {"title": "Pricing", "body": "Prices include applicable taxes where shown. Shipping is added at checkout before payment."}, {"title": "Cancellation", "body": "You may cancel before dispatch for a full refund. After dispatch, the returns policy applies."}, {"title": "Liability", "body": "Our liability is limited to the value of the order. Nothing here removes your statutory consumer rights."}, {"title": "Governing law", "body": "These terms are governed by the laws of England and Wales."}]}
      
    />
  );
}
