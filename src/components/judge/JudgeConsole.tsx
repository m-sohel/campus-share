"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Award,
  Sparkles,
  RotateCcw,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
  Wrench,
  Clock,
  ClipboardCheck,
  ShieldAlert,
  History,
  Check,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { DemoClockControl } from "@/components/clock/DemoClockControl";

interface JudgeConsoleProps {
  initialUser: Profile | null;
}

const PERSONAS = [
  {
    role: "owner",
    name: "Prof. Elena Rostova",
    email: "owner.lab@campusshare.edu",
    desc: "Resource Owner • University Central Engineering Lab",
    color: "from-blue-600 to-indigo-700",
  },
  {
    role: "manager",
    name: "Jordan Taylor",
    email: "manager.tech@campusshare.edu",
    desc: "Technician / Manager • Community Makerspace Desk",
    color: "from-amber-600 to-amber-800",
  },
  {
    role: "user",
    name: "Sarah Jenkins",
    email: "user.researcher@campusshare.edu",
    desc: "Borrower (Researcher) • Certified in Laser Safety L2",
    color: "from-emerald-600 to-teal-700",
  },
  {
    role: "user",
    name: "David Kim",
    email: "user.startup@campusshare.edu",
    desc: "Borrower (Startup Founder) • High-Speed Prototyping",
    color: "from-indigo-600 to-purple-700",
  },
  {
    role: "admin",
    name: "System Administrator",
    email: "admin@campusshare.edu",
    desc: "Platform Admin • Safety Council & Audit Chain Governance",
    color: "from-rose-700 to-slate-900",
  },
];

interface ScriptStep {
  step: number;
  title: string;
  roleName: string;
  roleType: string;
  targetEmail: string;
  linkUrl: string;
  linkLabel: string;
  actionText: string;
  observationText: string;
  principleText: string;
}

const LIFECYCLE_STEPS: ScriptStep[] = [
  {
    step: 1,
    title: "Resource Listing with Conditions & Checklist",
    roleName: "Prof. Elena Rostova (Owner)",
    roleType: "owner",
    targetEmail: "owner.lab@campusshare.edu",
    linkUrl: "/resources/new",
    linkLabel: "Open Resource Creation Studio",
    actionText: "Observe the live 'Listing Completeness' indicator. Toggle rules, weekly availability slots, safety instructions, and the physical condition inspection checklist.",
    observationText: "Completeness updates in real time based on safety notes, availability slots, and inspection checkpoints.",
    principleText: "Verified owners specify clear conditions upfront before equipment can ever be booked.",
  },
  {
    step: 2,
    title: "Discovery & Instant Eligibility Evaluation",
    roleName: "Sarah Jenkins (Borrower)",
    roleType: "user",
    targetEmail: "user.researcher@campusshare.edu",
    linkUrl: "/",
    linkLabel: "Open Catalog & Discovery",
    actionText: "Toggle the 'I'm eligible for this' filter. Open the Epilog Laser Cutter listing to see the live requirement breakdown.",
    observationText: "Sarah Jenkins passes because her Laser Safety Officer L2 certificate is on file and active.",
    principleText: "Every access decision explains WHY with plain-language reasons and actionable fix steps.",
  },
  {
    step: 3,
    title: "Reservation Request Submission",
    roleName: "Sarah Jenkins (Borrower)",
    roleType: "user",
    targetEmail: "user.researcher@campusshare.edu",
    linkUrl: "/dashboard/user",
    linkLabel: "View User Reservations & Passes",
    actionText: "Observe Sarah's approved laser reservation (#b-approved-laser) and pending requests in her dashboard.",
    observationText: "Displays reservation window, borrower reputation score (95/100), and automated fairness score (9.2/10).",
    principleText: "Fair allocation scoring prioritizes researchers and prevents monopolization.",
  },
  {
    step: 4,
    title: "Automated Requirement Verification Engine",
    roleName: "Automated Engine / Sarah Jenkins",
    roleType: "user",
    targetEmail: "user.researcher@campusshare.edu",
    linkUrl: "/dashboard/user",
    linkLabel: "Inspect Eligibility Matrix",
    actionText: "Scroll down to 'Resource Eligibility Matrix' to review the per-requirement pass/fail/expired evaluation across all 8 resources.",
    observationText: "Resources with missing prerequisites provide direct 1-click links to 'Get Certified' (/credentials/request).",
    principleText: "Zero unexplained rejections. Users always see how to achieve clearance.",
  },
  {
    step: 5,
    title: "Owner & Manager Request Review Queue",
    roleName: "Prof. Elena Rostova (Owner)",
    roleType: "owner",
    targetEmail: "owner.lab@campusshare.edu",
    linkUrl: "/dashboard/owner",
    linkLabel: "Open Owner Review Queue",
    actionText: "View the 'Pending Approvals' section showing Sarah Jenkins' cleanroom lithography request (#b-pending-review-cleanroom).",
    observationText: "Owner sees applicant reputation, project purpose, and fairness score before deciding.",
    principleText: "AI and scoring engines only assist; humans make the final access decisions.",
  },
  {
    step: 6,
    title: "Approve, Reject, or Waitlist with Audit Reason",
    roleName: "Prof. Elena Rostova (Owner)",
    roleType: "owner",
    targetEmail: "owner.lab@campusshare.edu",
    linkUrl: "/dashboard/owner",
    linkLabel: "Review Pending Booking",
    actionText: "On booking #b-pending-review-cleanroom, click 'Approve', enter an audit explanation (or leave default), and submit.",
    observationText: "Booking transitions to approved immediately and writes an immutable SHA-256 event to the audit trail.",
    principleText: "Every status transition requires a human explanation logged to the tamper-evident record.",
  },
  {
    step: 7,
    title: "Physical Check-in & Handover (QR Pass)",
    roleName: "Jordan Taylor (Makerspace Technician)",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/bookings/b-approved-laser/check-in",
    linkLabel: "Execute Step 7 Check-in",
    actionText: "Inspect checkpoints (clean bed, optics, interlocks). Sign off physical handover. Status becomes 'In Use'.",
    observationText: "Borrowers can also show their scannable digital QR pass on /bookings/b-approved-laser at the facility desk.",
    principleText: "Mobile-first inspection locks in baseline condition before borrower takes custody.",
  },
  {
    step: 8,
    title: "Post-Session Return & Condition Diff Inspection",
    roleName: "Jordan Taylor (Makerspace Technician)",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/bookings/b-in-use-scope/return",
    linkLabel: "Execute Step 8 Return",
    actionText: "Inspect returning Keysight Oscilloscope. Mark item #1 ('Power and interface cords functional') as 'Damaged' or 'Minor Issue'.",
    observationText: "Notice the live degradation alert: 'Degradation Flagged: Draft Incident will be created'. Also notes late return (+30m).",
    principleText: "Side-by-side comparison highlights exactly what changed during custody.",
  },
  {
    step: 9,
    title: "Incident Governance & Audited Dispute Resolution",
    roleName: "Jordan Taylor (Manager) / Lucas Wright (User) / Dr. Vance (Admin)",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/incidents/inc-seed-drone-01",
    linkLabel: "Inspect Incident #inc-seed-drone-01",
    actionText: "Follow the 5-step accountability flow: 1. Manager opens draft -> 2. Switch to Lucas Wright & submit response statement -> 3. Switch to Jordan & record finding -> 4. Switch to Lucas & dispute -> 5. Switch to Dr. Vance & issue binding arbitration.",
    observationText: "Notice the tamper-evident visual timeline, plain-language decision explanations, and zero automated penalties at every step.",
    principleText: "AI and algorithms only assist; human participants and administrators decide and retain full accountability.",
  },
  {
    step: 10,
    title: "Cryptographic Audit Trail & Historical Record",
    roleName: "System Administrator",
    roleType: "admin",
    targetEmail: "admin@campusshare.edu",
    linkUrl: "/dashboard/admin",
    linkLabel: "Open Admin Governance Desk",
    actionText: "Inspect the 'Cryptographic Audit Log' section. Verify SHA-256 chained hashes and 'Chain Status: VERIFIED (OK)'.",
    observationText: "All 10 steps—listing, verification, handover, return, and incident creation—are immutably linked.",
    principleText: "Complete mutual accountability with cryptographic mathematical proof of integrity.",
  },
];

export function JudgeConsole({ initialUser }: JudgeConsoleProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(initialUser);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleSwitchPersona = async (email: string, redirectTo?: string) => {
    setSwitchingEmail(email);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Failed to switch persona:", err);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const handleResetData = async () => {
    if (!confirm("Reset all demo bookings, condition records, and notifications to pristine baseline?")) {
      return;
    }

    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResetMessage(data.message || "Demo data reset successfully!");
        setCompletedSteps([]);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to reset:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const toggleStepCompleted = (stepNum: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNum) ? prev.filter((s) => s !== stepNum) : [...prev, stepNum]
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-400 text-slate-950 font-bold uppercase text-[10px] tracking-wider border-0 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Hackathon Judge Console
            </Badge>
            <Badge variant="outline" className="text-indigo-200 border-indigo-700 text-[10px]">
              Target: 5-Minute Evaluation
            </Badge>
            <span className="text-xs text-slate-400">• Higher Ed & Makerspace Trust Network</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Campus<span className="text-indigo-400">Share</span>: 10-Step Lifecycle Script
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
            Universities own millions of dollars of underused resources (laser cutters, oscilloscopes, cinema cameras, cleanrooms). CampusShare solves the trust deficit with verified credentials, physical condition diffing, zero automated penalties, and SHA-256 cryptographic audit logs. Follow this interactive script to complete the entire journey without any assistance.
          </p>

          {/* Active Session Indicator */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-2 border border-white/15 flex items-center gap-2.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Currently Acting As:</span>
              <strong className="text-white">
                {currentUser ? `${currentUser.full_name} (${currentUser.role.toUpperCase()})` : "Not signed in"}
              </strong>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetData}
              disabled={isResetting}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 gap-1.5 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              {isResetting ? "Resetting Demo..." : "Reset Demo Data"}
            </Button>
          </div>

          {resetMessage && (
            <div className="rounded-xl border border-emerald-400 bg-emerald-950/60 p-3 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Demo Clock Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Stage 8 Time-Based Flows &amp; Overdue Simulation
          </span>
          <span className="text-[11px] text-slate-400">
            Fast-forward time to trigger overdue alerts &amp; booking reminders
          </span>
        </div>
        <DemoClockControl />
      </div>

      {/* 1-Click Role Switcher Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              One-Click Role Switcher
            </h2>
            <p className="text-xs text-slate-500">
              Instant login as any seeded persona with zero passwords required.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Session sets instant auth cookie</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PERSONAS.map((p) => {
            const isActive = currentUser?.email.toLowerCase() === p.email.toLowerCase();
            const isPending = switchingEmail === p.email;

            return (
              <button
                key={p.email}
                type="button"
                onClick={() => handleSwitchPersona(p.email)}
                disabled={isPending}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between space-y-3 ${
                  isActive
                    ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        p.role === "admin"
                          ? "destructive"
                          : p.role === "owner"
                          ? "default"
                          : p.role === "manager"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[9px] uppercase font-bold"
                    >
                      {p.role}
                    </Badge>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" title="Active persona" />
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{p.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{p.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isActive ? "text-indigo-700" : "text-slate-600"}`}>
                    {isActive ? "Active Now ✓" : isPending ? "Switching..." : "Log in as →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script Progress Header */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            Lifecycle Tour Progress: {completedSteps.length} of 10 Steps Complete
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click checkboxes to track your test run or click deep links to execute each step.
          </p>
        </div>

        <div className="w-full sm:w-48 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${(completedSteps.length / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* 10-Step Lifecycle Script Accordion / Cards */}
      <div className="space-y-4">
        {LIFECYCLE_STEPS.map((s) => {
          const isDone = completedSteps.includes(s.step);
          const isUserMatching = currentUser?.email.toLowerCase() === s.targetEmail.toLowerCase();

          return (
            <div
              key={s.step}
              className={`rounded-2xl border transition p-5 shadow-sm space-y-4 ${
                isDone
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStepCompleted(s.step)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center transition border ${
                      isDone
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                    title={isDone ? "Mark as incomplete" : "Mark as completed"}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.step}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        Step {s.step}: {s.title}
                      </h3>
                      {isDone && (
                        <Badge variant="success" className="text-[10px] uppercase font-bold">
                          Completed ✓
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>Persona:</span>
                      <strong className="text-slate-800">{s.roleName}</strong>
                      {isUserMatching ? (
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active Persona
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchPersona(s.targetEmail)}
                          className="text-[11px] text-indigo-600 hover:underline font-semibold"
                        >
                          (Switch to {s.roleType} now)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Link href={s.linkUrl}>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm font-semibold"
                    >
                      {s.linkLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Instructions & Observations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 inline-block" />
                    What to Do:
                  </span>
                  <p className="text-slate-700 leading-relaxed">{s.actionText}</p>
                </div>

                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
                    What to Observe:
                  </span>
                  <p className="text-slate-700 leading-relaxed">{s.observationText}</p>
                </div>
              </div>

              {/* Core Principle Callout */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs text-indigo-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Hackathon Principle:</strong> {s.principleText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

