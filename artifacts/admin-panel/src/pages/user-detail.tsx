import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useUser, useUpdateUser, useAdjustBalance, adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Trash2 } from "lucide-react";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm text-foreground font-medium">{value}</div>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useUser(id);
  const updateUser = useUpdateUser();
  const adjustBalance = useAdjustBalance();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const user = data?.user;
  const deposits: any[] = data?.deposits ?? [];
  const withdrawals: any[] = data?.withdrawals ?? [];

  function startEdit() {
    setEditUsername(user?.username ?? "");
    setEditEmail(user?.email ?? "");
    setEditMode(true);
  }

  async function handleSaveEdit() {
    try {
      await updateUser.mutateAsync({ id, data: { username: editUsername, email: editEmail } });
      toast({ title: "User updated" });
      setEditMode(false);
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  }

  async function handleAdjust() {
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || adjustDelta.trim() === "") {
      toast({ title: "Enter a valid number (e.g. 50 or -25)", variant: "destructive" });
      return;
    }
    try {
      const result = await adjustBalance.mutateAsync({ id, delta, note: adjustNote || undefined });
      toast({ title: `Balance adjusted. New: $${result.new_balance}` });
      setAdjustDelta("");
      setAdjustNote("");
    } catch {
      toast({ title: "Failed to adjust balance", variant: "destructive" });
    }
  }

  async function handleDelete() {
    try {
      await adminFetch(`/users/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted" });
      setLocation("/users");
    } catch {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <button
        data-testid="button-back"
        onClick={() => setLocation("/users")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Users
      </button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !user ? (
        <div className="text-center py-20 text-muted-foreground">User not found.</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{user.username}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="button-delete-user"
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 px-3"
                >
                  <Trash2 size={13} className="mr-1.5" />
                  Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-card-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. All data associated with this user will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-card-border">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-confirm-delete"
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Profile card */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
              {!editMode ? (
                <Button
                  data-testid="button-edit-user"
                  size="sm"
                  variant="outline"
                  onClick={startEdit}
                  className="h-7 px-3 border-card-border text-xs"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    data-testid="button-save-user"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={updateUser.isPending}
                    className="h-7 px-3 bg-primary text-primary-foreground text-xs"
                  >
                    {updateUser.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    data-testid="button-cancel-edit"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(false)}
                    className="h-7 px-3 border-card-border text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Username</label>
                  <Input
                    data-testid="input-edit-username"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="h-9 bg-background border-card-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input
                    data-testid="input-edit-email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="h-9 bg-background border-card-border text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <Field label="Username" value={user.username} />
                <Field label="Email" value={user.email} />
                <Field label="Referral Code" value={<span className="font-mono text-primary">{user.referral_code ?? "—"}</span>} />
                <Field label="Balance" value={<span data-testid="text-user-balance" className="text-secondary font-bold">${Number(user.balance).toFixed(2)} USDT</span>} />
                <Field label="Has Deposited" value={user.has_deposited ? <CheckCircle size={16} className="text-secondary" /> : <XCircle size={16} className="text-muted-foreground/40" />} />
                <Field label="2FA Enabled" value={user.twofa_enabled ? <CheckCircle size={16} className="text-primary" /> : <XCircle size={16} className="text-muted-foreground/40" />} />
                <Field label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
                <Field label="User ID" value={<span className="font-mono text-xs text-muted-foreground">{user.id}</span>} />
              </div>
            )}
          </div>

          {/* Balance adjustment */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Adjust Balance</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-[140px]">
                <label className="text-xs text-muted-foreground mb-1 block">Delta (USDT)</label>
                <Input
                  data-testid="input-adjust-delta"
                  type="number"
                  placeholder="e.g. 50 or -25"
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  className="h-9 bg-background border-card-border text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
                <Input
                  data-testid="input-adjust-note"
                  placeholder="Reason for adjustment"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="h-9 bg-background border-card-border text-sm"
                />
              </div>
              <Button
                data-testid="button-adjust-balance"
                onClick={handleAdjust}
                disabled={adjustBalance.isPending}
                className="h-9 px-5 bg-primary text-primary-foreground text-sm shrink-0"
              >
                {adjustBalance.isPending ? "Applying..." : "Apply"}
              </Button>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Recent Deposits</h2>
              {deposits.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deposits yet.</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((d: any, i: number) => (
                    <div key={i} data-testid={`row-deposit-${i}`} className="flex items-center justify-between py-1.5 border-b border-card-border/50 last:border-0">
                      <span className="text-sm font-medium text-foreground">${Number(d.amount).toFixed(2)}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${d.status === "success" ? "bg-secondary/20 text-secondary border-secondary/30" : "bg-muted text-muted-foreground"} border`}>{d.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Recent Withdrawals</h2>
              {withdrawals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No withdrawals yet.</p>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map((w: any, i: number) => (
                    <div key={i} data-testid={`row-withdrawal-${i}`} className="flex items-center justify-between py-1.5 border-b border-card-border/50 last:border-0">
                      <span className="text-sm font-medium text-foreground">${Number(w.amount).toFixed(2)}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border ${
                          w.status === "approved" ? "bg-secondary/20 text-secondary border-secondary/30" :
                          w.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
                          "bg-[#FFB08A]/20 text-[#FFB08A] border-[#FFB08A]/30"
                        }`}>{w.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
