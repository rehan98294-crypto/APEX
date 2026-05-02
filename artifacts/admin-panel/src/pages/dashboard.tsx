import { useStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ArrowDownToLine, TrendingUp, Wallet, UserCheck, UserPlus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  loading?: boolean;
}

function StatCard({ label, value, sub, icon, accent = "text-primary", loading }: StatCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`${accent}`}>{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 mb-1" />
      ) : (
        <div data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="text-2xl font-bold text-foreground">{value}</div>
      )}
      {sub && !loading && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useStats();

  const w = data?.withdrawals;
  const u = data?.users;
  const d = data?.deposits;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
      </div>

      {/* User stats */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Users</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={u?.total ?? 0} icon={<Users size={16} />} accent="text-primary" loading={isLoading} />
        <StatCard label="Active (Deposited)" value={u?.active ?? 0} icon={<UserCheck size={16} />} accent="text-secondary" loading={isLoading} />
        <StatCard label="New (30d)" value={u?.new_30d ?? 0} icon={<UserPlus size={16} />} accent="text-[#FFB08A]" loading={isLoading} />
        <StatCard
          label="Total Balance"
          value={`$${Number(u?.total_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Wallet size={16} />}
          accent="text-primary"
          loading={isLoading}
          sub="USDT across all users"
        />
      </div>

      {/* Deposit stats */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Deposits</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Total Deposited"
          value={`$${Number(d?.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp size={16} />}
          accent="text-secondary"
          loading={isLoading}
          sub="All confirmed deposits"
        />
        <StatCard label="Deposit Transactions" value={d?.count ?? 0} icon={<TrendingUp size={16} />} accent="text-secondary" loading={isLoading} />
      </div>

      {/* Withdrawal stats */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Withdrawals</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Pending"
          value={w?.pending?.count ?? 0}
          sub={`$${Number(w?.pending?.total ?? 0).toFixed(2)} USDT`}
          icon={<ArrowDownToLine size={16} />}
          accent="text-[#FFB08A]"
          loading={isLoading}
        />
        <StatCard
          label="Approved"
          value={w?.approved?.count ?? 0}
          sub={`$${Number(w?.approved?.total ?? 0).toFixed(2)} USDT`}
          icon={<ArrowDownToLine size={16} />}
          accent="text-secondary"
          loading={isLoading}
        />
        <StatCard
          label="Rejected"
          value={w?.rejected?.count ?? 0}
          sub={`$${Number(w?.rejected?.total ?? 0).toFixed(2)} USDT`}
          icon={<ArrowDownToLine size={16} />}
          accent="text-destructive"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
