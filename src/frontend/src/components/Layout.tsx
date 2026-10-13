import { useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isPeopleSectionActive =
    location.pathname === "/people" ||
    location.pathname === "/messages" ||
    location.pathname.startsWith("/messages/");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isPeopleSectionActive={isPeopleSectionActive}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
        <footer className="shrink-0 bg-card border-t border-border px-6 py-3 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Nlock&apos;i
        </footer>
      </div>
    </div>
  );
}
