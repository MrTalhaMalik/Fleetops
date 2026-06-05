"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useAlerts } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

type Props = { onMenuClick: () => void };

export function Topbar({ onMenuClick }: Props) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: alerts = [] } = useAlerts();
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-lg">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted hover:bg-border-soft lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <div className="relative hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <input
            type="search"
            placeholder="Search drivers, events..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((s) => !s);
                setProfileOpen(false);
              }}
              className="relative rounded-xl p-2.5 text-muted transition-colors hover:bg-border-soft hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-border-soft p-4">
                    <p className="text-sm font-semibold">Notifications</p>
                    <span className="text-xs text-muted">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-muted">
                        No notifications yet
                      </p>
                    ) : (
                      alerts.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            "flex gap-3 border-b border-border-soft px-4 py-3 last:border-b-0",
                            !a.read && "bg-brand-soft/30",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1 size-2 shrink-0 rounded-full",
                              a.type === "emergency" && "bg-danger",
                              a.type === "shift" && "bg-brand",
                              a.type === "info" && "bg-info",
                              a.type === "system" && "bg-muted-soft",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{a.title}</p>
                            <p className="mt-0.5 truncate text-xs text-muted">{a.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link
                    href="/alerts"
                    onClick={() => setNotifOpen(false)}
                    className="block border-t border-border-soft px-4 py-3 text-center text-xs font-semibold text-brand-strong hover:bg-border-soft"
                  >
                    View all notifications
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen((s) => !s);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-border-soft"
            >
              <Avatar
                name={user?.name ?? "User"}
                color={user?.avatarColor ?? "bg-foreground"}
                size="md"
              />
              <span className="hidden text-sm font-medium text-foreground md:inline">
                {user?.name}
              </span>
              <ChevronDown className="hidden size-4 text-muted md:inline" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-border bg-surface p-2 shadow-xl"
                >
                  <div className="border-b border-border-soft px-3 py-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs capitalize text-muted">{user?.role}</p>
                  </div>
                  {user?.role === "driver" && (
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-border-soft"
                    >
                      My profile
                    </Link>
                  )}
                  <Link
                    href="/alerts"
                    onClick={() => setProfileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-border-soft"
                  >
                    Notifications
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
