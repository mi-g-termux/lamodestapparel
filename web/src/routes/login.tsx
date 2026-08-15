import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/AuthLayout";
import { Field, inputClass, btnPrimary } from "@/components/kit";
import { pageMeta } from "@/components/SiteShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => pageMeta("Sign In", "Sign in to your Velora account to track orders and access saved pieces."),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn({ name: email.split("@")[0] || "Guest", email });
    navigate({ to: "/account" });
  };

  return (
    <AuthLayout
      title="Sign in"
      intro="Welcome back. Your bag and wishlist are waiting."
      footer={
        <p className="text-muted-foreground">
          New to Velora?{" "}
          <Link to="/register" className="text-foreground underline hover:text-gold">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input required type="password" minLength={6} className={inputClass} />
        </Field>
        <div className="flex items-center justify-between text-[12px]">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" /> Remember me
          </label>
          <Link to="/forgot-password" className="underline hover:text-gold">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className={`${btnPrimary} w-full`}>
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
