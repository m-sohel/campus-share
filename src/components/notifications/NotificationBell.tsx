"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Notification } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Check,
  ExternalLink,
} from "lucide-react";

interface NotificationBellProps {
  initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "action_required":
        return <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-celadon-700 shrink-0 mt-0.5" />;
      case "warning":
        return <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-muted-teal-700 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60 transition-colors focus:outline-none focus:ring-2 focus:ring-celadon-600 cursor-pointer"
        aria-label="Notifications"
        title="Open Notification Centre"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-dusty-olive-200/90 shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-dusty-olive-200/60 bg-dusty-olive-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-dusty-olive-950">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-celadon-800 hover:text-celadon-950 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-dusty-olive-100">
            {isLoading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-dusty-olive-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-dusty-olive-600 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-celadon-600 mx-auto mb-1" />
                <p className="font-bold text-dusty-olive-900">All caught up!</p>
                <p className="text-[11px] text-dusty-olive-500">No unread notifications at this time.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 ${
                    !n.is_read ? "bg-soft-celadon-50/60 hover:bg-soft-celadon-100/70" : "bg-white hover:bg-dusty-olive-50/50"
                  }`}
                >
                  {getNotificationIcon(n.type)}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-dusty-olive-950 leading-snug">
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Mark as read"
                          className="text-[10px] text-celadon-800 hover:text-celadon-950 font-semibold shrink-0 cursor-pointer"
                        >
                          Read
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-dusty-olive-700 leading-relaxed">
                      {n.message}
                    </p>

                    {n.action_label && n.action_url && (
                      <div className="pt-1">
                        <Link
                          href={n.action_url}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-bold text-[10px] shadow-xs"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {n.action_label}
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-dusty-olive-400 font-mono">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] font-semibold text-celadon-800 hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
