import { useState } from "react";
import { useWithdrawals, useApproveWithdrawal, useRejectWithdrawal, useCreateTestWithdrawal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Clock,
  Wifi,
  FlaskConical,
} from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "all";

const STATUS_TABS: { label: string; value: Status; color: string }[] = [
  { label: "Pending",  value: "pending",  color: "text-[#FFB08A]" },
  { label: "Approved", value: "approved", color: "text-secondary" },
  { label: "Rejected", value: "rejected", color: "text-destructive" },
  { label: "All",      value: "all",      color: "text-foreground" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <Badge className="bg-[#FFB08A]/15 text-[#FFB08A] border border-[#FFB08A]/30 text-xs font-semibold px-2.5">Pending</Badge>;
  if (status === "approved")
    return <Badge className="bg-secondary/15 text-secondary border border-secondary/30 text-xs font-semibold px-2.5">Approved</Badge>;
  if (status === "rejected")
    return <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs font-semibold px-2.5">Rejected</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      data-testid="button-copy-address"
      className="ml-1.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
      title="Copy address"
    >
      {copied ? <CheckCircle size={13} className="text-secondary" /> : <Copy size={13} />}
    </button>
  );
}

function WithdrawalCard({
  w,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  w: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  return (
    <div
      data-testid={`card-withdrawal-${w.id}`}
      className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
    >
      {/* Top row: status + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={w.status} />
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-md font-mono">
            {w.network}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Clock size={11} />
          {new Date(w.created_at).toLocaleString(undefined, {
            month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </div>
      </div>

      {/* Amount — prominent */}
      <div>
        <div className="text-2xl font-bold text-foreground leading-none">
          ${Number(w.amount).toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground ml-1.5">USDT</span>
        </div>
        {w.fee > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Fee: ${Number(w.fee).toFixed(2)} · Receive: ${(Number(w.amount) - Number(w.fee)).toFixed(2)}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-2.5 text-sm border-t border-card-border pt-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground text-xs shrink-0 w-24">Withdrawal ID</span>
          <span
            data-testid={`text-withdrawal-id-${w.id}`}
            className="font-mono text-xs text-foreground break-all text-right"
          >
            {w.id}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground text-xs shrink-0 w-24">User ID</span>
          <span
            data-testid={`text-user-id-${w.id}`}
            className="font-mono text-xs text-muted-foreground break-all text-right"
          >
            {w.user_id}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground text-xs shrink-0 w-24">Wallet Address</span>
          <div className="flex items-center justify-end gap-1 min-w-0">
            <span
              data-testid={`text-wallet-${w.id}`}
              className="font-mono text-xs text-foreground break-all text-right"
            >
              {w.wallet_address}
            </span>
            <CopyButton text={w.wallet_address} />
          </div>
        </div>

        {w.users?.username && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs shrink-0 w-24">User</span>
            <span className="text-xs text-foreground font-medium">{w.users.username}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {w.status === "pending" && (
        <div className="flex gap-2 pt-1 border-t border-card-border">
          <Button
            data-testid={`button-approve-${w.id}`}
            onClick={() => onApprove(w.id)}
            disabled={approving || rejecting}
            className="flex-1 h-9 bg-secondary/15 text-secondary border border-secondary/40 hover:bg-secondary/25 text-sm font-semibold transition-colors"
            variant="outline"
          >
            <CheckCircle size={14} className="mr-1.5" />
            Approve
          </Button>
          <Button
            data-testid={`button-reject-${w.id}`}
            onClick={() => onReject(w.id)}
            disabled={approving || rejecting}
            className="flex-1 h-9 bg-destructive/10 text-destructive border border-destructive/40 hover:bg-destructive/20 text-sm font-semibold transition-colors"
            variant="outline"
          >
            <XCircle size={14} className="mr-1.5" />
            Reject & Refund
          </Button>
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex justify-between"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-28" /></div>
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2 border-t border-card-border pt-3">
        <div className="flex justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-32" /></div>
        <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-40" /></div>
        <div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-48" /></div>
      </div>
      <div className="flex gap-2 pt-1 border-t border-card-border">
        <Skeleton className="h-9 flex-1" /><Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}

export default function Withdrawals() {
  const [activeStatus, setActiveStatus] = useState<Status>("pending");
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useWithdrawals(activeStatus);
  const approve    = useApproveWithdrawal();
  const reject     = useRejectWithdrawal();
  const createTest = useCreateTestWithdrawal();
  const { toast }  = useToast();

  async function handleCreateTest() {
    try {
      const result = await createTest.mutateAsync();
      toast({
        title: "Test withdrawal created",
        description: `$${result.amount} USDT via ${result.network} — ID: ${result.withdrawal_id?.slice(0, 8)}…`,
      });
      setActiveStatus("pending");
    } catch (e: any) {
      toast({ title: "Failed to create test withdrawal", description: e.message, variant: "destructive" });
    }
  }

  const withdrawals: any[] = data?.withdrawals ?? [];

  async function handleApprove(id: string) {
    try {
      await approve.mutateAsync(id);
      toast({ title: "Withdrawal approved", description: "User has been notified." });
    } catch (e: any) {
      toast({ title: "Failed to approve", description: e.message, variant: "destructive" });
    }
  }

  async function handleReject(id: string) {
    try {
      const result = await reject.mutateAsync(id);
      toast({
        title: "Withdrawal rejected",
        description: `$${result?.refunded ?? ""} USDT refunded to user.`,
      });
    } catch (e: any) {
      toast({ title: "Failed to reject", description: e.message, variant: "destructive" });
    }
  }

  const pendingCount = withdrawals.filter((w: any) => w.status === "pending").length;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
            {activeStatus === "pending" && pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFB08A]/20 text-[#FFB08A] border border-[#FFB08A]/30">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Wifi size={12} className={isFetching ? "text-secondary animate-pulse" : "text-muted-foreground/40"} />
            {isFetching ? "Refreshing..." : dataUpdatedAt
              ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
              : "Auto-refreshes every 5 seconds"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="button-create-test-withdrawal"
            variant="outline"
            size="sm"
            onClick={handleCreateTest}
            disabled={createTest.isPending}
            className="border-dashed border-[#FFB08A]/50 text-[#FFB08A] hover:bg-[#FFB08A]/10 hover:text-[#FFB08A] h-9 px-3 text-sm font-semibold"
          >
            <FlaskConical size={14} className="mr-1.5" />
            {createTest.isPending ? "Creating…" : "Fake Request"}
          </Button>
          <Button
            data-testid="button-manual-refresh"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-card-border text-muted-foreground hover:text-foreground h-9 px-3"
          >
            <RefreshCw size={14} className={`mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-card-border rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-${tab.value}`}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
              activeStatus === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : `text-muted-foreground hover:text-foreground`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <CheckCircle size={36} className="opacity-20" />
          <p className="text-sm">
            {activeStatus === "pending"
              ? "No pending withdrawals — all clear."
              : `No ${activeStatus === "all" ? "" : activeStatus} withdrawals found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {withdrawals.map((w: any) => (
            <WithdrawalCard
              key={w.id}
              w={w}
              onApprove={handleApprove}
              onReject={handleReject}
              approving={approve.isPending}
              rejecting={reject.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
