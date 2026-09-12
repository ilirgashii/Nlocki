import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu, MessageCircle, Moon, Sun, User } from "lucide-react";
import { useMyProfile } from "../hooks/use-backend";
import { useUnreadCount } from "../hooks/use-messages";
import { useTheme } from "../hooks/use-theme";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, clear } = useInternetIdentity();
  const { data: profile } = useMyProfile();
  const { data: unreadCount = 0 } = useUnreadCount();

  const username =
    profile?.username || localStorage.getItem("auth:username") || "You";
  const displayEmail =
    profile?.email || localStorage.getItem("auth:email") || "Nlock'i user";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-card border-b border-border shadow-subtle flex items-center px-4 md:px-6 gap-3 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
        aria-label="Open navigation"
        data-ocid="header.menu_button"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* App name (mobile) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-6 h-6 rounded-md gradient-pink-accent flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-[10px]">
            N
          </span>
        </div>
        <span className="font-display font-bold text-sm text-foreground tracking-tight">
          Nlock&apos;i
        </span>
      </div>

      <div className="flex-1" />

      {/* Messages icon with unread badge */}
      {isAuthenticated && (
        <Link
          to="/messages"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
          aria-label={`Messages${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
          data-ocid="header.messages_link"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-primary text-primary-foreground border-0 flex items-center justify-center rounded-full"
              data-ocid="header.messages_badge"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Link>
      )}

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
        data-ocid="header.theme_toggle"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </Button>

      {/* User dropdown — only when authenticated */}
      {isAuthenticated && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User menu"
              data-ocid="header.user_menu_button"
            >
              <Avatar className="w-7 h-7">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={username}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-display font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {username}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
            data-ocid="header.user_dropdown_menu"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {displayEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className="gap-2 cursor-pointer"
              data-ocid="header.profile_link"
            >
              <Link to="/people">
                <User className="w-4 h-4" />
                My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={clear}
              data-ocid="header.logout_button"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
