import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  editingUserId?: string | null;
  testId?: string;
}

export default function UsernameInput({ value, onChange, editingUserId, testId = "input-username" }: UsernameInputProps) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.trim().length < 2) {
      setAvailable(null);
      setMessage("");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/check-username/${encodeURIComponent(username.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      setAvailable(data.available);
      setMessage(data.message);
    } catch {
      setAvailable(null);
      setMessage("");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (editingUserId) {
      setAvailable(null);
      setMessage("");
      return;
    }

    const timer = setTimeout(() => {
      checkUsername(value);
    }, 400);

    return () => clearTimeout(timer);
  }, [value, editingUserId, checkUsername]);

  return (
    <div className="space-y-2">
      <Label>اسم المستخدم *</Label>
      <div className="relative">
        <Input
          data-testid={testId}
          value={value}
          onChange={e => onChange(e.target.value)}
          dir="ltr"
          className={!editingUserId && available !== null ? (available ? "border-green-500 pr-9" : "border-red-500 pr-9") : "pr-9"}
          placeholder="username"
        />
        {!editingUserId && value.trim().length >= 2 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : available === true ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : available === false ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : null}
          </div>
        )}
      </div>
      {!editingUserId && message && (
        <p className={`text-xs ${available ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
