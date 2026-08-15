import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { OtpVerify } from "@/components/OtpVerify";
import { pageMeta } from "@/components/SiteShell";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/verify")({
  head: () =>
    pageMeta("Verify Your Number", "Confirm the one-time code we sent to finish creating your Velora account."),
  component: VerifyPage,
});

type Pending = { name: string; email: string; phone: string };

function VerifyPage() {
  const navigate = useNavigate();
  const { signIn } = useStore();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("velora:pending-signup");
      if (raw) setPending(JSON.parse(raw) as Pending);
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(() => {
    signIn({ name: pending?.name || "Guest", email: pending?.email || "" });
    try {
      sessionStorage.removeItem("velora:pending-signup");
    } catch {
      /* ignore */
    }
    navigate({ to: "/account" });
  }, [navigate, signIn, pending]);

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link to="/" className="font-display text-[19px] tracking-[0.3em] text-cream sm:text-[21px]">
          {site.brand.name}
        </Link>
        <Link to="/register" className="text-[11px] tracking-[0.14em] text-cream/50 uppercase hover:text-gold">
          Change details
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
        <OtpVerify destination={pending?.phone || "your phone"} onVerified={finish} />
      </main>
    </div>
  );
}
