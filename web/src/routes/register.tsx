import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/AuthLayout";
import { Field, inputClass, btnPrimary } from "@/components/kit";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/register")({
  head: () =>
    pageMeta("Create Account", "Create a Velora account for faster checkout, saved pieces and order tracking."),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo flow: park the signup and confirm the phone with a one-time code.
    try {
      sessionStorage.setItem("velora:pending-signup", JSON.stringify(form));
    } catch {
      /* ignore */
    }
    navigate({ to: "/verify" });
  };

  return (
    <AuthLayout
      title="Create account"
      intro="One account for checkout, wishlist and delivery updates."
      footer={
        <p className="text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="text-foreground underline hover:text-gold">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Full name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Mobile number" hint="We text a 4-digit code to confirm it's you.">
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+44 7700 900123"
            className={inputClass}
          />
        </Field>
        <Field label="Password" hint="At least 8 characters with one number.">
          <input required type="password" minLength={8} className={inputClass} />
        </Field>
        <label className="flex items-start gap-2.5 text-[12px] text-muted-foreground">
          <input required type="checkbox" className="mt-0.5" />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="underline hover:text-gold">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-gold">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <button type="submit" className={`${btnPrimary} w-full`}>
          Continue
        </button>
      </form>
    </AuthLayout>
  );
}
