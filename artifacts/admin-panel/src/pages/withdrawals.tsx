import { useState } from "react";
import { useWithdrawals, useApproveWithdrawal, useRejectWithdrawal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "all";

const STATUS_TABS: { label: string; value: Status }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

function statusBadge(status: string) {
  if (status === "pending")  return <Badge className="bg-[#FFB08A]/20 text-[#FFB08A] border-[#FFB08A]/30 border text-xs">Pending</Badge>;
  if (status === "approved") return <Badge className="bg-secondary/20 text-secondary border-secondary/30 border text-xs">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-destructive/20 text-destructive border-destructive/30 border text-xs">Rejected</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function Withdrawals() {
  const [activeStatus, setActiveStatus] = useState<Status>("pending");
  const { data, isLoading } = useWithdrawals(activeStatus);
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const { toast } = useToast();

  async function handleApprove(id: string) {
    try {
      await approve.mutateAsync(id);
      toast({ title: "Withdrawal approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  }

  async function handleReject(id: string) {
    try {
      await reject.mutateAsync(id);
      toast({ title: "Withdrawal rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  }

  const withdrawals: any[] = data ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and action withdrawal requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-card-border rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-${tab.value}`}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Network</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-card-border/50">
                <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-12" /></td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                <td className="px-5 py-4"><Skeleton className="h-5 w-16" /></td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                <td className="px-5 py-4"><Skeleton className="h-8 w-32" /></td>
              </tr>
            ))}
            {!isLoading && withdrawals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  No {activeStatus === "all" ? "" : activeStatus} withdrawals found.
                </td>
              </tr>
            )}
            {!isLoading && withdrawals.map((w: any) => (
              <tr
                key={w.id}
                data-testid={`row-withdrawal-${w.id}`}
                className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-4 font-semibold text-foreground">
                  ${Number(w.amount).toFixed(2)} <span className="text-muted-foreground font-normal text-xs">USDT</span>
                </td>
                <td className="px-5 py-4 text-muted-foreground">${Number(w.fee ?? 0).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">{w.network}</span>
                </td>
                <td className="px-5 py-4">
                  <span
                    data-testid={`text-wallet-${w.id}`}
                    className="font-mono text-xs text-muted-foreground truncate max-w-[140px] block"
                    title={w.wallet_address}
                  >
                    {w.wallet_address?.slice(0, 10)}...{w.wallet_address?.slice(-6)}
                  </span>
                </td>
                <td className="px-5 py-4">{statusBadge(w.status)}</td>
                <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  {w.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        data-testid={`button-approve-${w.id}`}
                        size="sm"
                        onClick={() => handleApprove(w.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-3 bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30 text-xs"
                        variant="outline"
                      >
                        <CheckCircle size={12} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        data-testid={`button-reject-${w.id}`}
                        size="sm"
                        onClick={() => handleReject(w.id)}
                        disabled={approve.isPending || reject.isPending}
                        className="h-7 px-3 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 text-xs"
                        variant="outline"
                      >
                        <XCircle size={12} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {w.status !== "pending" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(w.updated_at ?? w.created_at).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
