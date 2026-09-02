import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/SiteHeader";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Goldticket" },
      { name: "description", content: "Sign in with Google to buy tickets and track your numbers." },
      { property: "og:title", content: "Sign in — Goldticket" },
      { property: "og:description", content: "Sign in with Google to enter Goldticket prize draws." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/account", replace: true });
  }, [loading, user, navigate]);

  async function signIn() {
    setPending(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPending(false);
      toast.error("Could not sign in with Google. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/account" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Ticket className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold">Welcome to Goldticket</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with Google to buy tickets and see every number you own.
        </p>
        <Button className="mt-8 w-full" size="lg" disabled={pending} onClick={signIn}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue with Google
        </Button>
      </main>
    </div>
  );
}
