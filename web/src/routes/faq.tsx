import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/faq")({
  head: () => pageMeta("FAQ", "Answers on sizing, delivery, returns, payment and order tracking at Velora."),
  component: FaqPage,
});

function FaqPage() {
  return (
    <ContentPage
      eyebrow="Help"
      title="FAQ"
      body="Everything customers ask most, in one place."
      
      faq={[{"title": "How long does delivery take?", "body": "Standard delivery arrives in 3-5 working days, express in 1-2. Orders placed before 14:00 GMT are packed the same working day."}, {"title": "Is shipping free?", "body": "Shipping is complimentary on orders over $75. Below that a flat $6.50 applies, shown before payment."}, {"title": "How do returns work?", "body": "Returns are free within 14 days of delivery. Start from your account or the returns page and post the parcel with the prepaid label."}, {"title": "Which sizes should I choose?", "body": "Our pieces run true to size with a relaxed drape. The size guide lists exact garment measurements for each style."}, {"title": "Which payment methods do you accept?", "body": "Card payments via Stripe, PayPal, and cash on delivery in supported regions."}, {"title": "Can I change or cancel an order?", "body": "Yes, until the parcel is marked Packed. Contact our care team with your order number and we will amend or refund it."}]}
    />
  );
}
