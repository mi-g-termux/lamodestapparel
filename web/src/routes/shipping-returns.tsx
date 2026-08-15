import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/shipping-returns")({
  head: () => pageMeta("Shipping & Returns", "Velora delivery times, shipping costs and the 14-day free returns process explained."),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <ContentPage
      eyebrow="Delivery"
      title="Shipping & Returns"
      body="Clear timelines, prepaid returns, no restocking fees."
      sections={[{"title": "Delivery times", "body": "Standard 3-5 working days. Express 1-2 working days. International 5-9 working days with duties calculated at checkout."}, {"title": "Shipping costs", "body": "Complimentary over $75. A flat $6.50 applies below that threshold. Express is $12 in all regions we serve."}, {"title": "Returns window", "body": "Fourteen days from delivery, unworn and with tags attached. Swimwear and pierced jewellery are excluded for hygiene reasons."}, {"title": "How to return", "body": "Open your account, choose the order, select the pieces and print the prepaid label. Refunds are issued to the original payment method within five working days of the parcel arriving."}, {"title": "Exchanges", "body": "Exchanges follow the same window. If your replacement size is unavailable we refund automatically and let you know by email."}]}
      
    />
  );
}
