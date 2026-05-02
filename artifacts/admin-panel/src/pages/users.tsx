import { useState } from "react";
import { Link } from "wouter";
import { useUsers } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 50;

  const { data, isLoading } = useUsers(page, LIMIT, search);
  const users: any[] = data?.users ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total.toLocaleString()} total users` : "Manage user accounts"}
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search-users"
            placeholder="Search by username or email..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-8 h-9 bg-card border-card-border text-sm"
          />
        </div>
        <Button
          data-testid="button-search"
          type="submit"
          size="sm"
          className="h-9 px-4 bg-primary text-primary-foreground"
        >
          Search
        </Button>
        {search && (
          <Button
            data-testid="button-clear-search"
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-3 border-card-border text-muted-foreground"
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deposited</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">2FA</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-card-border/50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  {search ? `No users matching "${search}".` : "No users found."}
                </td>
              </tr>
            )}
            {!isLoading && users.map((u: any) => (
              <tr
                key={u.id}
                data-testid={`row-user-${u.id}`}
                className="border-b border-card-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <span data-testid={`text-username-${u.id}`} className="font-medium text-foreground">{u.username}</span>
                </td>
                <td className="px-5 py-4 text-muted-foreground text-xs">{u.email}</td>
                <td className="px-5 py-4 font-mono text-sm text-foreground">
                  <span data-testid={`text-balance-${u.id}`}>${Number(u.balance).toFixed(2)}</span>
                </td>
                <td className="px-5 py-4">
                  {u.has_deposited
                    ? <CheckCircle size={14} className="text-secondary" />
                    : <XCircle size={14} className="text-muted-foreground/40" />
                  }
                </td>
                <td className="px-5 py-4">
                  {u.twofa_enabled
                    ? <CheckCircle size={14} className="text-primary" />
                    : <XCircle size={14} className="text-muted-foreground/40" />
                  }
                </td>
                <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <Link href={`/users/${u.id}`}>
                    <a
                      data-testid={`link-user-detail-${u.id}`}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View
                    </a>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              data-testid="button-prev-page"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 px-3 border-card-border text-muted-foreground"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              data-testid="button-next-page"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-8 px-3 border-card-border text-muted-foreground"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
