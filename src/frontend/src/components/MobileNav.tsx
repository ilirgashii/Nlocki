import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarCheck,
  Dumbbell,
  Home,
  Users,
  UtensilsCrossed,
} from "lucide-react";
const tabs = [
  { to: "/", label: "Today", icon: Home },
  { to: "/planner", label: "Plan", icon: CalendarCheck },
  { to: "/fitness", label: "Move", icon: Dumbbell },
  { to: "/nutrition", label: "Eat", icon: UtensilsCrossed },
  { to: "/people", label: "People", icon: Users },
];
export function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden shrink-0 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
