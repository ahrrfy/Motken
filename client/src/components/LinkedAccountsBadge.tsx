import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface LinkedAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId: string;
  mosqueName: string;
}

interface LinkedAccountsBadgeProps {
  userId: string;
  userRole: string;
  userName: string;
}

export default function LinkedAccountsBadge({ userId, userRole, userName }: LinkedAccountsBadgeProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [hasLinked, setHasLinked] = useState(false);

  const isVisible = user?.role === "admin" && ["teacher", "supervisor"].includes(userRole);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    fetch(`/api/users/${userId}/linked-accounts`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!cancelled) {
          setAccounts(data);
          setHasLinked(data.length > 0);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId, isVisible]);

  if (!isVisible || !hasLinked) return null;

  const roleLabel = (r: string) => r === "teacher" ? "أستاذ" : r === "supervisor" ? "مشرف" : r;

  return (
    <>
      <Badge
        variant="outline"
        className="cursor-pointer gap-1 text-xs bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 whitespace-nowrap"
        onClick={() => setOpen(true)}
        data-testid={`badge-linked-${userId}`}
      >
        <Link2 className="w-3 h-3" />
        {accounts.length} {accounts.length === 1 ? "حساب مرتبط" : "حسابات مرتبطة"}
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">حسابات مرتبطة — {userName}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-3">
            هذا المستخدم لديه حسابات في مساجد/مراكز أخرى بنفس رقم الهاتف
          </div>
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div>
                  <div className="font-medium text-sm">{acc.name}</div>
                  <div className="text-xs text-muted-foreground">@{acc.username}</div>
                </div>
                <div className="text-left">
                  <Badge variant="secondary" className="text-xs mb-1">
                    {roleLabel(acc.role)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">{acc.mosqueName}</div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
