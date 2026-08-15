import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/privacy")({
  head: () => pageMeta("Privacy Policy", "How Velora collects, uses and protects your personal data."),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      body="Written plainly, without hidden clauses."
      sections={[{"title": "What we collect", "body": "Name, email, delivery address, phone number and order history. Payment details are handled by our payment provider and never stored on our servers."}, {"title": "Why we collect it", "body": "To process orders, provide delivery updates, handle returns and answer support requests. Marketing email is sent only with explicit consent."}, {"title": "Cookies", "body": "Essential cookies keep your bag and session working. Analytics cookies are optional and can be declined without affecting checkout."}, {"title": "Your rights", "body": "You can request a copy of your data, correct it, or ask for deletion at any time by writing to our care team. We respond within 30 days."}, {"title": "Retention", "body": "Order records are kept for seven years for tax purposes. Marketing preferences are deleted as soon as you unsubscribe."}]}
      
    />
  );
}
