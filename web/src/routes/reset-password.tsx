import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/AuthLayout";
import { Field, inputClass, btnPrimary } from "@/components/kit";
import { pageMeta } from "@/components/SiteShell";

export const Route = createFileRoute("/reset-password")({
  head: () => pageMeta("Set New Password", "Choose a new password for your Velora account."),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && pw !== confirm;

  return (
    <AuthLayout
      title="Choose a new password"
      intro="Pick something you haven't used before. You'll stay signed in on this device."
      footer={
        <p className="text-muted-foreground">
          <Link to="/login" className="text-foreground underline hover:text-gold">
            Back to sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <div className="border border-clay bg-cream px-5 py-6">
          <p className="text-[14px]">Password updated</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Your password has been changed. Sign in to continue.
          </p>
          <Link to="/login" className={`${btnPrimary} mt-5`}>
            Sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mismatch) setDone(true);
          }}
          className="space-y-5"
        >
          <Field label="New password" hint="At least 8 characters with one number.">
            <input
              required
              type="password"
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Confirm password">
            <input
              required
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div aria-live="polite" className="min-h-4">
            {mismatch ? <p className="text-[12px] text-destructive">Passwords don't match.</p> : null}
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            Update password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
