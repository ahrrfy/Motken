import { useState } from "react";
import { Plus, X, ClipboardList, Users, CalendarCheck, BookOpen, MessageSquare, Award } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { hapticLight, hapticMedium } from "@/lib/haptic";
import { cn } from "@/lib/utils";

const fabActions: Record<string, { icon: any; label: string; href: string; color: string }[]> = {
  admin: [
    { icon: Users, label: "إضافة طالب", href: "/students", color: "bg-blue-500" },
    { icon: CalendarCheck, label: "تسجيل حضور", href: "/attendance", color: "bg-green-500" },
    { icon: MessageSquare, label: "رسالة جديدة", href: "/messages", color: "bg-violet-500" },
    { icon: Award, label: "إضافة تخرج", href: "/courses", color: "bg-amber-500" },
  ],
  supervisor: [
    { icon: CalendarCheck, label: "تسجيل حضور", href: "/attendance", color: "bg-green-500" },
    { icon: Users, label: "الطلاب", href: "/students", color: "bg-blue-500" },
    { icon: MessageSquare, label: "رسالة جديدة", href: "/messages", color: "bg-violet-500" },
  ],
  teacher: [
    { icon: ClipboardList, label: "إضافة واجب", href: "/assignments", color: "bg-teal-500" },
    { icon: CalendarCheck, label: "تسجيل حضور", href: "/attendance", color: "bg-green-500" },
    { icon: BookOpen, label: "تسميع", href: "/quran", color: "bg-amber-500" },
    { icon: MessageSquare, label: "رسالة", href: "/messages", color: "bg-violet-500" },
  ],
  student: [
    { icon: ClipboardList, label: "واجباتي", href: "/assignments", color: "bg-teal-500" },
    { icon: BookOpen, label: "حفظي", href: "/quran", color: "bg-amber-500" },
    { icon: MessageSquare, label: "رسالة", href: "/messages", color: "bg-violet-500" },
  ],
};

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { effectiveRole, user } = useAuth();
  const role = effectiveRole || user?.role || "student";
  const actions = fabActions[role] || fabActions.student;

  const toggle = () => {
    hapticMedium();
    setOpen(!open);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <div className="fixed bottom-20 left-4 z-50 flex flex-col-reverse items-center gap-2" dir="rtl">
        {open && actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              className={cn(
                "flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full text-white shadow-lg text-xs font-medium",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                action.color
              )}
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => {
                hapticLight();
                navigate(action.href);
                setOpen(false);
              }}
              data-testid={`fab-action-${i}`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
        <button
          onClick={toggle}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300",
            open
              ? "bg-red-500 rotate-45"
              : "bg-primary"
          )}
          data-testid="fab-main"
        >
          {open ? <X className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-primary-foreground" />}
        </button>
      </div>
    </>
  );
}
