import { useState } from "react";
import { useLocation } from "wouter";
import { adminFetch, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    try {
      setAuthToken(secret.trim());
      await adminFetch("/stats");
      setLocation("/");
    } catch {
      import("@/lib/api").then(m => m.clearAuthToken());
      toast({ title: "Access denied", description: "Invalid admin secret.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5CBFFE] to-[#2BD9A8] flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Apex</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your admin secret to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              data-testid="input-admin-secret"
              type="password"
              placeholder="Admin secret key"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              className="h-11 bg-card border-card-border text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Button
            data-testid="button-login"
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
