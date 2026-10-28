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
  Award,
  ShieldAlert,
  Menu,
  X,
  FileCheck,
  PlusCircle,
} from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DemoClockControl } from "@/components/clock/DemoClockControl";

interface NavbarProps {
  currentUser: Profile | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        return "success";
      case "manager":
        return "teal";
      case "user":
      default:
        return "default";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dusty-olive-200/80 bg-white/95 backdrop-blur-md">
      {/* Top persona bar */}
      {currentUser && (
        <div className="bg-soft-celadon-50/80 border-b border-dusty-olive-200/60 px-4 py-1 text-xs text-dusty-olive-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-dusty-olive-950">
                {currentUser.full_name}
              </span>
              <span className="text-dusty-olive-400">•</span>
              <span className="text-dusty-olive-600 hidden sm:inline">
                {currentUser.department || currentUser.email}
              </span>
              <Badge
                variant={getRoleBadgeVariant(currentUser.role)}
                className="uppercase text-[9px] tracking-wider font-bold py-0 h-4"
              >
                {currentUser.role}
              </Badge>
              {currentUser.reputation_score !== undefined && (
                <span className="inline-flex items-center gap-1 text-celadon-800 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Reputation {currentUser.reputation_score}
                </span>
              )}
            </div>

            <Link
              href="/login"
              className="text-celadon-800 hover:text-celadon-950 font-semibold flex items-center gap-1 hover:underline text-[11px]"
            >
              <Sparkles className="w-3 h-3 text-celadon-600" />
              Switch Persona
            </Link>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-celadon-700 text-white flex items-center justify-center shadow-xs group-hover:bg-celadon-800 transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-dusty-olive-950 tracking-tight">
                Campus<span className="text-celadon-700">Share</span>
              </span>
              <span className="hidden sm:block text-[10px] text-dusty-olive-500 tracking-wide font-medium">
                Academic &amp; Makerspace Trust Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                pathname === "/"
                  ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80 shadow-xs"
                  : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-celadon-700" />
                Catalog
              </span>
            </Link>

            <Link
              href="/bookings"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                pathname.startsWith("/bookings")
                  ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80 shadow-xs"
                  : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-celadon-700" />
                Bookings &amp; Passes
              </span>
            </Link>

            <Link
              href="/incidents"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                pathname.startsWith("/incidents")
                  ? "bg-rose-50 text-rose-900 border border-rose-200 shadow-xs"
                  : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Incidents
              </span>
            </Link>

            {currentUser && (
              <>
                <Link
                  href={`/dashboard/${currentUser.role}`}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname.startsWith(`/dashboard/${currentUser.role}`)
                      ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80 shadow-xs"
                      : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {currentUser.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />}
                    {currentUser.role === "owner" && <Layers className="w-3.5 h-3.5 text-celadon-700" />}
                    {currentUser.role === "manager" && <Wrench className="w-3.5 h-3.5 text-muted-teal-700" />}
                    {currentUser.role === "user" && <UserCheck className="w-3.5 h-3.5 text-celadon-700" />}
                    Dashboard
                  </span>
                </Link>

                {(currentUser.role === "owner" || currentUser.role === "admin") && (
                  <Link
                    href="/resources/new"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      pathname === "/resources/new"
                        ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80"
                        : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
                    }`}
                  >
                    + List Resource
                  </Link>
                )}

                {(currentUser.role === "owner" || currentUser.role === "manager" || currentUser.role === "admin") && (
                  <Link
                    href="/credentials/verify"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      pathname === "/credentials/verify"
                        ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80"
                        : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
                    }`}
                  >
                    Verify Queue
                  </Link>
                )}

                {currentUser.role === "user" && (
                  <Link
                    href="/credentials/request"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      pathname === "/credentials/request"
                        ? "bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-300/80"
                        : "text-dusty-olive-700 hover:text-dusty-olive-950 hover:bg-dusty-olive-100/60"
                    }`}
                  >
                    Get Certified
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right Section: Demo Clock, Judge Pill, Notification Bell, Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <DemoClockControl compact />
          </div>

          <Link
            href="/judge"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-tea-green-200 text-tea-green-950 hover:bg-tea-green-300 border border-tea-green-400 transition-colors shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-tea-green-800" />
            <span>Judge Script</span>
          </Link>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="gap-1.5 text-dusty-olive-800 border-dusty-olive-300 hover:bg-dusty-olive-50 hidden sm:inline-flex"
              >
                <LogOut className="w-3.5 h-3.5" />
                {loggingOut ? "..." : "Sign Out"}
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

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-dusty-olive-700 hover:bg-dusty-olive-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-dusty-olive-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2">
            <DemoClockControl compact />
          </div>

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-dusty-olive-900 hover:bg-soft-celadon-50"
          >
            <Compass className="w-4 h-4 text-celadon-700" /> Catalog
          </Link>

          <Link
            href="/bookings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-dusty-olive-900 hover:bg-soft-celadon-50"
          >
            <ClipboardCheck className="w-4 h-4 text-celadon-700" /> Bookings &amp; Handover
          </Link>

          <Link
            href="/incidents"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-rose-900 hover:bg-rose-50"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" /> Incidents &amp; Disputes
          </Link>

          {currentUser && (
            <>
              <Link
                href={`/dashboard/${currentUser.role}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-celadon-950 bg-soft-celadon-100"
              >
                <UserCheck className="w-4 h-4 text-celadon-700" /> My {currentUser.role.toUpperCase()} Dashboard
              </Link>

              {(currentUser.role === "owner" || currentUser.role === "admin") && (
                <Link
                  href="/resources/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-dusty-olive-900 hover:bg-soft-celadon-50"
                >
                  <PlusCircle className="w-4 h-4 text-celadon-700" /> List New Resource
                </Link>
              )}

              {(currentUser.role === "owner" || currentUser.role === "manager" || currentUser.role === "admin") && (
                <Link
                  href="/credentials/verify"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-dusty-olive-900 hover:bg-soft-celadon-50"
                >
                  <FileCheck className="w-4 h-4 text-muted-teal-700" /> Verification Queue
                </Link>
              )}

              {currentUser.role === "user" && (
                <Link
                  href="/credentials/request"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-dusty-olive-900 hover:bg-soft-celadon-50"
                >
                  <Award className="w-4 h-4 text-celadon-700" /> Request Certification
                </Link>
              )}

              <div className="pt-2 border-t border-dusty-olive-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full text-xs gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
