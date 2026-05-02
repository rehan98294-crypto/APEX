import { useActionLog } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  approve_withdrawal: "text-secondary bg-secondary/10",
  reject_withdrawal:  "text-destructive bg-destructive/10",
  edit_user:          "text-primary bg-primary/10",
  delete_user:        "text-destructive bg-destructive/10",
  adjust_balance:     "text-[#FFB08A] bg-[#FFB08A]/10",
};

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function Activity() {
  const { data, isLoading } = useActionLog();
  const logs: any[] = data ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All admin actions in reverse-chronological order</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-5 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-7 w-28 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <ClipboardList size={32} className="opacity-30" />
            <span className="text-sm">No admin actions recorded yet.</span>
          </div>
        )}

        {!isLoading && logs.length > 0 && (
          <div className="divide-y divide-card-border/50">
            {logs.map((log: any, i: number) => (
              <div
                key={log.id}
                data-testid={`row-log-${i}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 ${ACTION_COLORS[log.action] ?? "text-foreground bg-muted"}`}>
                  {actionLabel(log.action)}
                </span>
                <div className="flex-1 min-w-0">
                  {log.note && (
                    <p data-testid={`text-log-note-${i}`} className="text-sm text-foreground mb-0.5 truncate">{log.note}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {log.target_id && (
                      <span className="font-mono truncate max-w-[200px]">{log.target_id}</span>
                    )}
                    {log.ip_address && <span>{log.ip_address}</span>}
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
