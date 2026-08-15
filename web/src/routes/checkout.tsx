import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { site } from "@/content/site";
import { SiteShell, PageHeading, pageMeta } from "@/components/SiteShell";
import { Field, inputClass, btnPrimary, btnOutline } from "@/components/kit";
import { useStore, type Address, computeTotals } from "@/lib/store";
import { useLocale } from "@/lib/locale";
import {
  citiesByCountry,
  countryByCode,
  deliveryEstimate,
  shippingCost,
  shippingMethods,
  validatePhone,
  validatePostcode,
} from "@/lib/regions";
import payPaypal from "@/assets/pay-paypal.png";
import payStripe from "@/assets/pay-stripe.png";

export const Route = createFileRoute("/checkout")({
  head: () =>
    pageMeta(
      "Checkout",
      "Secure Velora checkout — delivery address, shipping options with live delivery estimates, then payment.",
    ),
  component: CheckoutPage,
});

const payments = [
  { id: "Stripe", label: "Stripe", logo: payStripe, alt: "Stripe", note: "Card payment via Stripe" },
  { id: "PayPal", label: "PayPal", logo: payPaypal, alt: "PayPal", note: "Pay with your PayPal balance or card" },
  { id: "Cash on delivery", label: "Cash on delivery", logo: null, alt: "", note: "Pay the courier when your parcel arrives" },
] as const;
const steps = ["Address", "Delivery", "Payment"] as const;

const selectClass = `${inputClass} appearance-none pr-10 bg-[length:14px] bg-[right_1rem_center] bg-no-repeat`;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Checkout progress">
      {steps.map((label, i) => (
        <li key={label} aria-current={i === step ? "step" : undefined} className="min-w-0">
          <span className={`block h-[3px] ${i <= step ? "bg-gold" : "bg-border"}`} />
          <span className="mt-2 flex min-w-0 items-center gap-2">
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${
                i <= step ? "bg-ink text-primary-foreground" : "border border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`truncate text-[11px] tracking-[0.12em] uppercase ${
                i <= step ? "" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function CheckoutPage() {
  const { cart, placeOrder, account } = useStore();
  const { country, setCountry, countries, money } = useLocale();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<string>(payments[0]!.id);
  const [methodId, setMethodId] = useState("standard");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [address, setAddress] = useState<Address>({
    name: account?.name ?? "",
    email: account?.email ?? "",
    dial: country.dial,
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    countryCode: country.code,
    country: country.name,
  });

  // Keep the address country in sync with the shopper's detected/chosen region.
  useEffect(() => {
    setAddress((a) =>
      a.countryCode === country.code
        ? a
        : { ...a, countryCode: country.code, country: country.name, dial: country.dial, state: "", city: "", postcode: "" },
    );
  }, [country]);

  const selected = countryByCode(address.countryCode);
  const methods = useMemo(() => shippingMethods(selected.code), [selected.code]);
  const method = methods.find((m) => m.id === methodId) ?? methods[0]!;
  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const totals = computeTotals(cart, shippingCost(method, subtotal));
  const cities = citiesByCountry[selected.code] ?? [];

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }));

  const changeCountry = (code: string) => {
    const c = countryByCode(code);
    setAddress((a) => ({
      ...a,
      countryCode: c.code,
      country: c.name,
      dial: c.dial,
      state: "",
      city: "",
      postcode: "",
    }));
    setCountry(c.code);
    setErrors({});
  };

  const validateAddress = () => {
    const next: Record<string, string> = {};
    if (!address.name.trim()) next["name"] = "Full name is required.";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(address.email.trim())) next["email"] = "Enter a valid email address.";
    const phoneError = validatePhone(selected.code, address.phone);
    if (phoneError) next["phone"] = phoneError;
    if (!address.line1.trim()) next["line1"] = "Street address is required.";
    if (!address.city.trim()) next["city"] = "City is required.";
    if (selected.states?.length && !address.state) next["state"] = `${selected.stateLabel ?? "State"} is required.`;
    const postcodeError = validatePostcode(selected.code, address.postcode);
    if (postcodeError) next["postcode"] = postcodeError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    const order = placeOrder({ address, payment, shipping: method });
    navigate({ to: "/order/$id", params: { id: order.id } });
  };

  if (cart.length === 0) {
    return (
      <SiteShell>
        <PageHeading title="Checkout" crumbs={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} />
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="border border-border px-6 py-20 text-center">
            <p className="font-display text-[24px]">Your bag is empty.</p>
            <Link to="/shop" className={`${btnPrimary} mt-6`}>
              Continue shopping
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeading title="Checkout" crumbs={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} />

      <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div className="min-w-0">
            <Stepper step={step} />

            {/* STEP 1 — address */}
            {step === 0 ? (
              <div className="space-y-10">
                <section>
                  <h2 className="section-title">Contact</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" error={errors["name"]}>
                      <input value={address.name} onChange={set("name")} autoComplete="name" className={inputClass} />
                    </Field>
                    <Field label="Email" error={errors["email"]}>
                      <input
                        type="email"
                        value={address.email}
                        onChange={set("email")}
                        autoComplete="email"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </section>

                <section>
                  <h2 className="section-title">Delivery address</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Country / region" hint="Sets your prices, delivery options and phone format.">
                        <select
                          value={address.countryCode}
                          onChange={(e) => changeCountry(e.target.value)}
                          autoComplete="country"
                          className={selectClass}
                        >
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field
                      label="Phone"
                      error={errors["phone"]}
                      hint={`${selected.dial} · ${selected.phoneMin === selected.phoneMax ? `${selected.phoneMin} digits` : `${selected.phoneMin}–${selected.phoneMax} digits`}`}
                    >
                      <div className="flex">
                        <span className="grid shrink-0 place-items-center border border-r-0 border-border bg-cream px-3 text-[13px] text-muted-foreground">
                          {selected.dial}
                        </span>
                        <input
                          inputMode="numeric"
                          value={address.phone}
                          onChange={(e) =>
                            setAddress((a) => ({ ...a, phone: e.target.value.replace(/[^\d\s-]/g, "") }))
                          }
                          autoComplete="tel-national"
                          className={`${inputClass} min-w-0`}
                        />
                      </div>
                    </Field>

                    {selected.states?.length ? (
                      <Field label={selected.stateLabel ?? "State"} error={errors["state"]}>
                        <select value={address.state} onChange={set("state")} className={selectClass}>
                          <option value="">Select {(selected.stateLabel ?? "state").toLowerCase()}</option>
                          {selected.states.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      <Field label="Region / area" hint="Optional in this country.">
                        <input value={address.state} onChange={set("state")} className={inputClass} />
                      </Field>
                    )}

                    <Field label="City / town" error={errors["city"]}>
                      <input
                        value={address.city}
                        onChange={set("city")}
                        list="velora-cities"
                        autoComplete="address-level2"
                        className={inputClass}
                      />
                    </Field>
                    <datalist id="velora-cities">
                      {cities.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>

                    <Field label={selected.postcodeLabel} error={errors["postcode"]}>
                      <input
                        value={address.postcode}
                        onChange={set("postcode")}
                        autoComplete="postal-code"
                        className={inputClass}
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Street address" error={errors["line1"]} hint="House / building number and street name.">
                        <input
                          value={address.line1}
                          onChange={set("line1")}
                          autoComplete="address-line1"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Apartment, floor, landmark (optional)">
                        <input
                          value={address.line2}
                          onChange={set("line2")}
                          autoComplete="address-line2"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateAddress()) setStep(1);
                      }}
                      className={btnPrimary}
                    >
                      Continue to delivery
                    </button>
                    <Link to="/cart" className={btnOutline}>
                      Back to bag
                    </Link>
                  </div>
                </section>
              </div>
            ) : null}

            {/* STEP 2 — shipping options */}
            {step === 1 ? (
              <section>
                <h2 className="section-title">Delivery options</h2>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Shipping to {address.city}
                  {address.state ? `, ${address.state}` : ""} · {selected.flag} {selected.name}
                </p>
                <div className="mt-5 space-y-3">
                  {methods.map((m) => {
                    const price = shippingCost(m, subtotal);
                    return (
                      <label
                        key={m.id}
                        className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border px-4 py-4 transition-colors ${
                          method.id === m.id ? "border-ink bg-cream" : "border-border hover:border-clay"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={m.id}
                          checked={method.id === m.id}
                          onChange={() => setMethodId(m.id)}
                          className="mt-1 accent-[color:var(--ink)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px]">{m.name}</span>
                          <span className="mt-0.5 block text-[12px] text-muted-foreground">{m.detail}</span>
                          <span className="mt-1 block text-[12px]">
                            Arrives {deliveryEstimate(m)} ({m.minDays}–{m.maxDays} business days)
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px]">
                          {price === 0 ? "Free" : money(price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Standard delivery is free on orders over {money(75)}. Duties for {selected.name} are settled at
                  delivery where applicable.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStep(2)} className={btnPrimary}>
                    Continue to payment
                  </button>
                  <button type="button" onClick={() => setStep(0)} className={btnOutline}>
                    Edit address
                  </button>
                </div>
              </section>
            ) : null}

            {/* STEP 3 — payment */}
            {step === 2 ? (
              <section>
                <h2 className="section-title">Payment</h2>
                <div className="mt-5 space-y-2.5">
                  {payments.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 border px-4 py-3.5 text-[13px] transition-colors ${
                        payment === p.id ? "border-ink bg-cream" : "border-border hover:border-clay"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={p.id}
                        checked={payment === p.id}
                        onChange={() => setPayment(p.id)}
                        className="accent-[color:var(--ink)]"
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        {p.logo ? (
                          <img
                            src={p.logo}
                            alt={p.alt}
                            loading="lazy"
                            className="h-5 w-auto shrink-0 object-contain"
                          />
                        ) : (
                          <span className="shrink-0 text-[13px]">{p.label}</span>
                        )}
                        <span className="truncate text-[12px] text-muted-foreground">{p.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Demo checkout — no payment is captured and no card details are stored.
                </p>

                <div className="mt-8 border border-border p-5">
                  <h3 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                    Delivering to
                  </h3>
                  <p className="mt-2 text-[13px]">{address.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {address.city}
                    {address.state ? `, ${address.state}` : ""} {address.postcode}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {selected.flag} {address.country} · {address.dial} {address.phone}
                  </p>
                  <p className="mt-2 text-[12px]">
                    {method.name} · arrives {deliveryEstimate(method)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="mt-3 text-[12px] underline hover:text-gold"
                  >
                    Edit details
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="submit" className={btnPrimary}>
                    Place order
                  </button>
                  <button type="button" onClick={() => setStep(1)} className={btnOutline}>
                    Back to delivery
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="h-fit border border-border bg-cream p-6 lg:sticky lg:top-8">
            <h2 className="section-title">Order review</h2>
            <ul className="mt-5 space-y-4">
              {cart.map((i) => (
                <li key={i.key} className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3">
                  <img src={i.image} alt={i.name} width={64} height={80} className="h-20 w-16 object-cover" />
                  <div className="min-w-0 text-[12px]">
                    <p className="truncate text-[13px]">{i.name}</p>
                    <p className="text-muted-foreground">
                      {i.color} · {i.size} · Qty {i.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px]">{money(i.unitPrice * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-3 border-t border-clay pt-5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{site.cartPage.subtotal}</dt>
                <dd>{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="min-w-0 text-muted-foreground">
                  {site.cartPage.shipping}
                  <span className="block text-[11px]">{step >= 1 ? method.name : "Calculated next step"}</span>
                </dt>
                <dd className="shrink-0">
                  {totals.shipping === 0 ? site.cartPage.shippingFree : money(totals.shipping)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{site.cartPage.tax}</dt>
                <dd>{money(totals.tax)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-clay pt-3 text-[15px] font-medium">
                <dt>{site.cartPage.total}</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>
            {step >= 1 ? (
              <p className="mt-4 text-[11px] text-muted-foreground">
                Estimated arrival {deliveryEstimate(method)}.
              </p>
            ) : null}
          </aside>
        </form>
      </div>
    </SiteShell>
  );
}
