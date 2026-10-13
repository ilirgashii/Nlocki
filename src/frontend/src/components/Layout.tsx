import { useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { ConnectionStatus } from "./ConnectionStatus";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
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
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isPeopleSectionActive={isPeopleSectionActive}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <ConnectionStatus />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-background p-4 md:p-6"
        >
          {children}
        </main>
        <footer className="hidden md:block shrink-0 bg-card border-t border-border px-6 py-3 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Nlock&apos;i
        </footer>
        <MobileNav />
      </div>
    </div>
  );
}
