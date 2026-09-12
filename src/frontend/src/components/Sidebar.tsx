import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  CalendarCheck,
  Dumbbell,
  LayoutDashboard,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, alwaysVisible: true },
  { label: "Me & People", path: "/people", icon: Users, alwaysVisible: true },
  {
    label: "Daily Planner",
    path: "/planner",
    icon: CalendarCheck,
    alwaysVisible: false,
  },
  {
    label: "Fitness Log",
    path: "/fitness",
    icon: Dumbbell,
    alwaysVisible: false,
  },
  {
    label: "Nutrition Log",
    path: "/nutrition",
    icon: UtensilsCrossed,
    alwaysVisible: false,
  },
  {
    label: "Progress Charts",
    path: "/charts",
    icon: BarChart2,
    alwaysVisible: false,
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isPeopleSectionActive: boolean;
}

export function Sidebar({
  open,
  onClose,
  isPeopleSectionActive,
}: SidebarProps) {
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.alwaysVisible || !isPeopleSectionActive,
  );

  const content = (
    <aside className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-pink-accent flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xs">
              N
            </span>
          </div>
          <span className="font-display font-bold text-base text-sidebar-foreground tracking-tight">
            Nlock&apos;i
          </span>
        </div>
        {/* Mobile close */}
        <button
          type="button"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Enter" && onClose()}
          className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
          aria-label="Close sidebar"
          data-ocid="sidebar.close_button"
        >
          ✕
        </button>
      </div>

      {/* Back to Dashboard — only when on people/messages section */}
      {isPeopleSectionActive && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-smooth w-full"
            data-ocid="sidebar.back_to_dashboard.link"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
        aria-label="Main navigation"
      >
        {visibleItems.map(({ label, path, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : path === "/people"
                ? location.pathname === "/people" ||
                  location.pathname === "/messages" ||
                  location.pathname.startsWith("/messages/")
                : location.pathname.startsWith(path);

          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth relative ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              data-ocid={`sidebar.${label.toLowerCase().replace(/\s+/g, "_").replace(/&/g, "and")}.link`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"}`}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer slogan */}
      <div className="px-5 py-4 border-t border-sidebar-border shrink-0">
        <p className="text-xs text-muted-foreground text-center italic">
          Life in easy mode
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-full">{content}</div>
      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            role="presentation"
            aria-hidden="true"
          />
          <div className="relative z-10 flex">{content}</div>
        </div>
      )}
    </>
  );
}
