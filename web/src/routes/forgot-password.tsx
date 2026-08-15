import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/AuthLayout";
import { Field, inputClass, btnPrimary } from "@/components/kit";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => pageMeta("Forgot Password", "Request a secure link to reset your Velora account password."),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <AuthLayout
      title="Reset your password"
      intro="Enter the email on your account and we'll send a secure link that expires in 60 minutes."
      footer={
        <p className="text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="text-foreground underline hover:text-gold">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="border border-clay bg-cream px-5 py-6">
          <p className="text-[14px]">Check your inbox</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            If {email} matches an account, a reset link is on its way.
          </p>
          <Link to="/reset-password" className={`${btnPrimary} mt-5`}>
            Open reset page
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="space-y-5"
        >
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button type="submit" className={`${btnPrimary} w-full`}>
            Send reset link
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
