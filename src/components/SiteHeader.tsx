import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Goldticket</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link to="/" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Prizes
          </Link>
          {loading ? null : user ? (
            <>
              <Link
                to="/account"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                My tickets
              </Link>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
