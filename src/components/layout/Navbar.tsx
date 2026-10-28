"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Profile, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Layers,
  Wrench,
  UserCheck,
  LogOut,
  Sparkles,
  Compass,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  currentUser: Profile | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "owner":
        return "default";
      case "manager":
        return "warning";
      case "user":
      default:
        return "secondary";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      {/* Top micro-bar showing current persona if logged in */}
      {currentUser && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-slate-200">
                Logged in as {currentUser.full_name}
              </span>
              <span>•</span>
              <span className="text-slate-500">{currentUser.department || currentUser.email}</span>
              <Badge variant={getRoleBadgeVariant(currentUser.role)} className="uppercase text-[10px] tracking-wider font-bold">
                {currentUser.role}
              </Badge>
              {currentUser.reputation_score !== undefined && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Reputation: {currentUser.reputation_score}
                </span>
              )}
            </div>
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              Switch Seeded Account
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Campus<span className="text-indigo-600">Share</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 tracking-wide font-medium">
                University & Makerspace Trust Network
              </span>
            </div>
          </Link>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                pathname === "/"
                  ? "bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Catalog
              </span>
            </Link>

            <Link
              href="/bookings"
              className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                pathname.startsWith("/bookings")
                  ? "bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" />
                Bookings & Handover
              </span>
            </Link>

            {currentUser && (
              <>
                <Link
                  href={`/dashboard/${currentUser.role}`}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                    pathname.startsWith(`/dashboard/${currentUser.role}`)
                      ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {currentUser.role === "admin" && <ShieldCheck className="w-4 h-4" />}
                    {currentUser.role === "owner" && <Layers className="w-4 h-4" />}
                    {currentUser.role === "manager" && <Wrench className="w-4 h-4" />}
                    {currentUser.role === "user" && <UserCheck className="w-4 h-4" />}
                    Dashboard
                  </span>
                </Link>

                {(currentUser.role === "owner" || currentUser.role === "admin") && (
                  <Link
                    href="/resources/new"
                    className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                      pathname === "/resources/new"
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    + List Resource
                  </Link>
                )}

                {(currentUser.role === "owner" || currentUser.role === "manager" || currentUser.role === "admin") && (
                  <Link
                    href="/credentials/verify"
                    className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                      pathname === "/credentials/verify"
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Verify Queue
                  </Link>
                )}

                {currentUser.role === "user" && (
                  <Link
                    href="/credentials/request"
                    className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                      pathname === "/credentials/request"
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Get Certified
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="gap-1.5 text-slate-700 dark:text-slate-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                {loggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="default" size="sm" className="gap-1.5">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

