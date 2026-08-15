/**
 * Single source of truth for status colours (§3.4). Reused by every screen.
 * Tones are token classes only — no raw colour values in components.
 */
export type Tone = "grey" | "blue" | "purple" | "green" | "amber" | "red" | "strike";

export const toneClass: Record<Tone, string> = {
  grey: "bg-bg-subtle text-muted",
  blue: "bg-info-bg text-info",
  purple: "bg-plum-bg text-plum",
  green: "bg-ok-bg text-ok",
  amber: "bg-warn-bg text-warn",
  red: "bg-bad-bg text-bad",
  strike: "bg-bg-subtle text-muted line-through",
};

export const orderStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Failed",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusTone: Record<OrderStatus, Tone> = {
  Pending: "grey",
  Confirmed: "blue",
  Packed: "blue",
  Shipped: "purple",
  "Out for delivery": "purple",
  Delivered: "green",
  Cancelled: "strike",
  Returned: "amber",
  Failed: "red",
};

export const paymentStatuses = [
  "Pending",
  "Authorised",
  "Paid",
  "Partially refunded",
  "Refunded",
  "Failed",
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentTone: Record<PaymentStatus, Tone> = {
  Pending: "grey",
  Authorised: "blue",
  Paid: "green",
  "Partially refunded": "amber",
  Refunded: "amber",
  Failed: "red",
};

export const productStatuses = ["Active", "Draft", "Scheduled", "Archived"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productTone: Record<ProductStatus, Tone> = {
  Active: "green",
  Draft: "grey",
  Scheduled: "blue",
  Archived: "grey",
};

export const moderationStates = ["Pending", "Published", "Rejected", "Handled"] as const;
export type ModerationState = (typeof moderationStates)[number];

export const moderationTone: Record<ModerationState, Tone> = {
  Pending: "amber",
  Published: "green",
  Rejected: "grey",
  Handled: "green",
};

/** Customer-facing descriptions for each order status (editable via strings). */
export const orderStatusCopy: Record<OrderStatus, string> = {
  Pending: "We have your order and are waiting on payment confirmation.",
  Confirmed: "Payment received — your order is being prepared.",
  Packed: "Your order is packed and waiting for courier pickup.",
  Shipped: "Your parcel is on its way.",
  "Out for delivery": "Your parcel is with the courier for delivery today.",
  Delivered: "Delivered. We hope you love it.",
  Cancelled: "This order was cancelled.",
  Returned: "We have received your return.",
  Failed: "Payment failed — no charge was made.",
};
