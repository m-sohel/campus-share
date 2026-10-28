"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Check,
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
  },
  {
    role: "manager",
    name: "Jordan Taylor",
    email: "manager.tech@campusshare.edu",
    desc: "Technician / Manager • Community Makerspace Desk",
  },
  {
    role: "user",
    name: "Sarah Jenkins",
    email: "user.researcher@campusshare.edu",
    desc: "Borrower (Researcher) • Certified in Laser Safety L2",
  },
  {
    role: "user",
    name: "David Kim",
    email: "user.startup@campusshare.edu",
    desc: "Borrower (Startup Founder) • High-Speed Prototyping",
  },
  {
    role: "admin",
    name: "System Administrator",
    email: "admin@campusshare.edu",
    desc: "Platform Admin • Safety Council & Audit Chain Governance",
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
    title: "Discovery & Instant Pre-Flight Eligibility Engine",
    roleName: "Sarah Jenkins (Researcher)",
    roleType: "user",
    targetEmail: "user.researcher@campusshare.edu",
    linkUrl: "/",
    linkLabel: "Open Equipment Catalog",
    actionText: "Use the 'I am eligible for this' filter. Click into the Class 4 Laser Cutter to observe real-time evaluation against Sarah's verified credentials.",
    observationText: "System provides plain-language reasons and immediate fix instructions for missing prerequisites.",
    principleText: "Eligibility is checked upfront so borrowers never submit unviable booking requests.",
  },
  {
    step: 3,
    title: "Booking Request with Purpose & Fairness Scoring",
    roleName: "David Kim (Startup Founder)",
    roleType: "user",
    targetEmail: "user.startup@campusshare.edu",
    linkUrl: "/resources/res-laser-01",
    linkLabel: "Open Laser Station Page",
    actionText: "Inspect the required slot selection and booking purpose field. Review the computed fairness weight and queue standing.",
    observationText: "Fair allocation policies evaluate booking frequency to avoid lab monopolization.",
    principleText: "Equipment is allocated transparently through verifiable need and fair-share rotation.",
  },
  {
    step: 4,
    title: "System Pre-Flight Verification & Eligibility Pass",
    roleName: "Automated Rules Engine",
    roleType: "system",
    targetEmail: "admin@campusshare.edu",
    linkUrl: "/dashboard/user",
    linkLabel: "Open Eligibility Matrix",
    actionText: "View the user dashboard's Resource Eligibility Matrix to confirm automated verification without human bottlenecks.",
    observationText: "Valid safety credentials and insurance records verify instantly without administrative delay.",
    principleText: "Automate prerequisite verification to save institutional staff hours of manual paperwork.",
  },
  {
    step: 5,
    title: "Owner / Delegated Technician Review",
    roleName: "Prof. Elena Rostova (Owner)",
    roleType: "owner",
    targetEmail: "owner.lab@campusshare.edu",
    linkUrl: "/dashboard/owner",
    linkLabel: "Open Owner Desk",
    actionText: "Review incoming requests in the Pending Approvals queue. Inspect applicant reputation and proposed research usage.",
    observationText: "Full context is surfaced in a single card, including borrower reputation score and fairness score.",
    principleText: "Facility custodians retain ultimate authority over high-value capital assets.",
  },
  {
    step: 6,
    title: "Approve, Reject, or Priority Waitlist",
    roleName: "Prof. Elena Rostova (Owner)",
    roleType: "owner",
    targetEmail: "owner.lab@campusshare.edu",
    linkUrl: "/dashboard/owner",
    linkLabel: "Decide Pending Booking",
    actionText: "Click 'Approve' on Sarah's laser cutter request. Supply a brief plain-language explanation for the audit log.",
    observationText: "Decision writes to the immutable audit trail and triggers an instant in-app notification to the borrower.",
    principleText: "Every access decision requires human accountability and leaves a permanent record.",
  },
  {
    step: 7,
    title: "Physical Handover & Mobile Check-in Checklist",
    roleName: "Jordan Taylor (Technician)",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/bookings",
    linkLabel: "Open Handover Desk",
    actionText: "Click 'Check-in' on an approved reservation. Complete each physical checkpoint inspection (OK / Minor / Damaged).",
    observationText: "Status moves to 'In Use' and creates an immutable initial condition baseline.",
    principleText: "Handover baseline protects both owner and borrower from unfounded liability.",
  },
  {
    step: 8,
    title: "Return Inspection & Pure Condition Diff",
    roleName: "Jordan Taylor (Technician)",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/bookings",
    linkLabel: "Open Return Desk",
    actionText: "Select an active booking. Record return inspection with 1 item marked 'Damaged' or 'Minor Issue'.",
    observationText: "Side-by-side condition diff highlights degradation and auto-drafts an incident in Draft status.",
    principleText: "Zero automated penalties: algorithms identify variances; humans adjudicate findings.",
  },
  {
    step: 9,
    title: "Incident Adjudication & Dispute Due Process",
    roleName: "Jordan Taylor & Admin",
    roleType: "manager",
    targetEmail: "manager.tech@campusshare.edu",
    linkUrl: "/incidents",
    linkLabel: "Open Incident Governance Desk",
    actionText: "Inspect the auto-drafted incident. Note how the borrower can respond with their perspective before any finding is recorded.",
    observationText: "Multi-party timeline documents statements, decisions, and administrative arbitration appeals.",
    principleText: "Restorative justice and due process prevent toxic campus disputes.",
  },
  {
    step: 10,
    title: "Cryptographic SHA-256 Audit Chain Verification",
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
      <div className="rounded-3xl bg-gradient-to-br from-dusty-olive-950 via-soft-celadon-950 to-muted-teal-950 text-white p-6 sm:p-10 shadow-xl border border-celadon-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-tea-green-400 text-dusty-olive-950 font-bold uppercase text-[10px] tracking-wider border-0 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Hackathon Judge Console
            </Badge>
            <Badge variant="outline" className="text-tea-green-200 border-tea-green-800 text-[10px]">
              Target: 5-Minute Evaluation
            </Badge>
            <span className="text-xs text-dusty-olive-300">• Higher Ed &amp; Makerspace Trust Network</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Campus<span className="text-tea-green-400">Share</span>: 10-Step Lifecycle Script
          </h1>

          <p className="text-dusty-olive-200 text-xs sm:text-sm leading-relaxed max-w-3xl">
            Universities own millions of dollars of underused resources (laser cutters, oscilloscopes, cinema cameras, cleanrooms). CampusShare solves the trust deficit with verified credentials, physical condition diffing, zero automated penalties, and SHA-256 cryptographic audit logs. Follow this interactive script to complete the entire journey without any assistance.
          </p>

          {/* Active Session Indicator */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-2 border border-white/15 flex items-center gap-2.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-celadon-400 animate-pulse" />
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
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 gap-1.5 shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              {isResetting ? "Resetting Demo..." : "Reset Demo Data"}
            </Button>
          </div>

          {resetMessage && (
            <div className="rounded-2xl border border-celadon-400 bg-celadon-950/70 p-3 text-xs text-celadon-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-celadon-400 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Demo Clock Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-dusty-olive-600 uppercase tracking-wider">
            Stage 8 Time-Based Flows &amp; Overdue Simulation
          </span>
          <span className="text-[11px] text-dusty-olive-500">
            Fast-forward time to trigger overdue alerts &amp; booking reminders
          </span>
        </div>
        <DemoClockControl />
      </div>

      {/* 1-Click Role Switcher Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-celadon-700" />
              One-Click Role Switcher
            </h2>
            <p className="text-xs text-dusty-olive-600">
              Instant login as any seeded persona with zero passwords required.
            </p>
          </div>
          <span className="text-xs text-dusty-olive-400 font-mono">Session sets instant auth cookie</span>
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
                    ? "border-celadon-600 bg-celadon-50/70 shadow-xs ring-2 ring-celadon-600/20"
                    : "border-dusty-olive-200/90 bg-white hover:border-celadon-300 hover:shadow-xs"
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
                      <span className="h-2 w-2 rounded-full bg-celadon-600 inline-block" title="Active persona" />
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-dusty-olive-950 leading-snug">{p.name}</h4>
                  <p className="text-[11px] text-dusty-olive-500 line-clamp-2 leading-relaxed">{p.desc}</p>
                </div>

                <div className="pt-2 border-t border-dusty-olive-100 flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isActive ? "text-celadon-800" : "text-dusty-olive-600"}`}>
                    {isActive ? "Active Now ✓" : isPending ? "Switching..." : "Log in as →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script Progress Header */}
      <div className="p-4 rounded-2xl border border-dusty-olive-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-dusty-olive-950">
            Lifecycle Tour Progress: {completedSteps.length} of 10 Steps Complete
          </h3>
          <p className="text-xs text-dusty-olive-500 mt-0.5">
            Click checkboxes to track your test run or click deep links to execute each step.
          </p>
        </div>

        <div className="w-full sm:w-48 h-2.5 rounded-full bg-dusty-olive-100 overflow-hidden">
          <div
            className="h-full bg-celadon-700 transition-all duration-300 rounded-full"
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
              className={`rounded-2xl border transition p-5 shadow-xs space-y-4 ${
                isDone
                  ? "border-celadon-300 bg-celadon-50/40"
                  : "border-dusty-olive-200/90 bg-white hover:border-celadon-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-dusty-olive-100">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStepCompleted(s.step)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold shrink-0 flex items-center justify-center transition border ${
                      isDone
                        ? "bg-celadon-700 text-white border-celadon-700"
                        : "bg-dusty-olive-100 text-dusty-olive-700 border-dusty-olive-200 hover:bg-dusty-olive-200"
                    }`}
                    title={isDone ? "Mark as incomplete" : "Mark as completed"}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.step}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-dusty-olive-950 leading-snug">
                        Step {s.step}: {s.title}
                      </h3>
                      {isDone && (
                        <Badge variant="success" className="text-[10px] uppercase font-bold">
                          Completed ✓
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-dusty-olive-500">
                      <span>Persona:</span>
                      <strong className="text-dusty-olive-900">{s.roleName}</strong>
                      {isUserMatching ? (
                        <span className="text-[11px] text-celadon-800 font-semibold bg-celadon-50 px-2 py-0.5 rounded border border-celadon-200">
                          Active Persona
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchPersona(s.targetEmail)}
                          className="text-[11px] text-celadon-800 hover:underline font-semibold"
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
                      className="h-8 text-xs bg-celadon-700 hover:bg-celadon-800 text-white gap-1.5 shadow-xs font-semibold"
                    >
                      {s.linkLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Instructions & Observations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 bg-dusty-olive-50/60 p-3 rounded-xl border border-dusty-olive-200/60">
                  <span className="font-bold text-dusty-olive-950 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-celadon-700 inline-block" />
                    What to Do:
                  </span>
                  <p className="text-dusty-olive-700 leading-relaxed">{s.actionText}</p>
                </div>

                <div className="space-y-1 bg-dusty-olive-50/60 p-3 rounded-xl border border-dusty-olive-200/60">
                  <span className="font-bold text-dusty-olive-950 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-teal-700 inline-block" />
                    What to Observe:
                  </span>
                  <p className="text-dusty-olive-700 leading-relaxed">{s.observationText}</p>
                </div>
              </div>

              {/* Core Principle Callout */}
              <div className="rounded-xl border border-muted-teal-200 bg-muted-teal-50/60 p-2.5 text-xs text-muted-teal-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-muted-teal-700 shrink-0" />
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
