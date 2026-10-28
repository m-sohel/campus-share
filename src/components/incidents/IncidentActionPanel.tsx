"use client";

import { useState } from "react";
import { Incident, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShieldAlert,
  Send,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface IncidentActionPanelProps {
  incident: Incident;
  currentUserId: string;
  currentUserRole: UserRole;
}

export function IncidentActionPanel({
  incident,
  currentUserId,
  currentUserRole,
}: IncidentActionPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [openNotes, setOpenNotes] = useState("");
  const [userStatement, setUserStatement] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [managerDecision, setManagerDecision] = useState<
    "fault_user" | "fault_equipment" | "no_fault_wear_and_tear" | "warning_issued" | "cost_share" | "dismissed"
  >("no_fault_wear_and_tear");
  const [managerNotes, setManagerNotes] = useState("");
  const [penaltyTerms, setPenaltyTerms] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [adminResolution, setAdminResolution] = useState<
    "upheld" | "overturned" | "compromise" | "dismissed"
  >("compromise");
  const [adminNotes, setAdminNotes] = useState("");

  const isAffectedUser =
    currentUserId === incident.affected_user_id || currentUserRole === "user";
  const isManagerOrOwner =
    currentUserRole === "manager" || currentUserRole === "owner" || currentUserRole === "admin";
  const isAdmin = currentUserRole === "admin";

  // 1. Action: Manager opens draft
  const handleOpenDraft = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: openNotes || "Opened for formal physical and written review." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open draft");
      setSuccessMessage("Draft incident formally opened for borrower response.");
      router.refresh();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Action: User responds
  const handleUserRespond = async () => {
    if (userStatement.trim().length < 10) {
      setErrorMessage("Borrower statement must be at least 10 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: userStatement, evidence_url: evidenceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit statement");
      setSuccessMessage("Statement submitted. Station manager notified for review.");
      router.refresh();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Action: Manager decides
  const handleManagerDecide = async () => {
    if (managerNotes.trim().length < 10) {
      setErrorMessage("Manager decision notes must be at least 10 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: managerDecision,
          notes: managerNotes,
          penalty_applied: penaltyTerms || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record decision");
      setSuccessMessage("Manager decision recorded and audited.");
      router.refresh();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Action: User disputes
  const handleUserDispute = async () => {
    if (disputeReason.trim().length < 15) {
      setErrorMessage("Dispute grounds must be at least 15 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to file dispute");
      setSuccessMessage("Formal dispute appealed to Campus Administration.");
      router.refresh();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Action: Admin resolves dispute
  const handleAdminResolve = async () => {
    if (adminNotes.trim().length < 15) {
      setErrorMessage("Admin council notes must be at least 15 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/resolve-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: adminResolution, notes: adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue arbitration");
      setSuccessMessage("Binding Campus Governance arbitration issued and audited.");
      router.refresh();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. DRAFT INCIDENT: Manager review & open */}
      {incident.status === "draft" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Step 1: Intake & Physical Verification</Badge>
              <span className="text-xs text-amber-900 font-semibold">• Draft Incident</span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-1">
              Review & Open Incident for Investigation
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              This incident was auto-drafted by the condition engine following return inspection diffs.
              No penalty has been applied. Opening allows the borrower to view physical evidence and submit their explanation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isManagerOrOwner ? (
              <div className="space-y-3">
                <textarea
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Technician physical intake notes (optional)..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 min-h-[70px]"
                />
                <Button
                  onClick={handleOpenDraft}
                  disabled={isLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Open Incident for Investigation
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Awaiting station technician physical intake sign-off.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. OPEN INCIDENT: Borrower submits statement */}
      {incident.status === "open" && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-indigo-600 text-white">
                Step 2: Borrower Statement
              </Badge>
              <span className="text-xs text-indigo-900 font-semibold">• Formal Intake</span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-1">
              Borrower Response & Explanation
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              CampusShare requires human-assisted review. The borrower has the right to explain what happened before any decision is reached.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAffectedUser ? (
              <div className="space-y-3">
                <textarea
                  value={userStatement}
                  onChange={(e) => setUserStatement(e.target.value)}
                  placeholder="Provide your factual statement explaining the circumstances, precautions taken, or condition observed..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 min-h-[90px]"
                />
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="Optional supporting evidence photo URL (e.g. Unsplash or file link)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
                />
                <Button
                  onClick={handleUserRespond}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Submit Formal Statement
                </Button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-white/60 p-3 rounded-lg border border-slate-200">
                Notice sent to borrower (<strong>{incident.affected_user_name || "Borrower"}</strong>). Awaiting statement submission before manager adjudication.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. UNDER REVIEW: Manager records formal decision */}
      {incident.status === "under_review" && (
        <Card className="border-indigo-300 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Step 3: Station Manager Finding</Badge>
              <span className="text-xs text-indigo-900 font-semibold">• Adjudication</span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-1">
              Record Operational Decision & Justification
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Review the physical evidence and borrower statement. Record an auditable finding with clear plain-language rationale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isManagerOrOwner ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">Operational Finding:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { val: "no_fault_wear_and_tear", title: "Normal Wear & Tear", desc: "No borrower fault or liability" },
                      { val: "fault_equipment", title: "Equipment Defect", desc: "Pre-existing fatigue / failure" },
                      { val: "warning_issued", title: "Formal Advisory Warning", desc: "First-time protocol guidance, no fee" },
                      { val: "cost_share", title: "Mutual Cost-Share", desc: "Equitable shared replacement terms" },
                      { val: "fault_user", title: "User Misuse / Negligence", desc: "Direct breach of operating rules" },
                      { val: "dismissed", title: "Incident Dismissed", desc: "No actionable damage confirmed" },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors ${
                          managerDecision === opt.val
                            ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{opt.title}</span>
                          <input
                            type="radio"
                            name="manager_decision"
                            value={opt.val}
                            checked={managerDecision === opt.val}
                            onChange={() => setManagerDecision(opt.val as any)}
                            className="text-indigo-600"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Justification & Findings (Plain Language):
                  </label>
                  <textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Explain the physical findings, photos checked, or logs inspected to reach this decision..."
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-indigo-500 min-h-[80px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Remedy or Financial Terms (Optional):
                  </label>
                  <input
                    type="text"
                    value={penaltyTerms}
                    onChange={(e) => setPenaltyTerms(e.target.value)}
                    placeholder="e.g. '$25 maintenance fee', '30-minute refresher training required', 'None'"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
                  />
                </div>

                <Button
                  onClick={handleManagerDecide}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                >
                  <Scale className="w-4 h-4" />
                  Record Manager Decision & Notify Borrower
                </Button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Your response was submitted. Station Manager (<strong>{incident.reporter_name || "Manager"}</strong>) is currently reviewing evidence to record a finding.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. RESOLVED INCIDENT: User can file dispute appeal if unsatisfied */}
      {incident.status === "resolved" && !incident.admin_resolution && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">Resolved</Badge>
              <span className="text-xs text-slate-600 font-semibold">• Decision Recorded</span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-1">
              Dispute Rights & Appeal Window
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              CampusShare enforces fair governance. If the borrower disputes this finding, it can be appealed to Campus Administration for independent binding arbitration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isAffectedUser ? (
              <div className="space-y-3">
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you disagree with this finding and provide grounds for Administrative appeal..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white focus:outline-rose-500 min-h-[80px]"
                />
                <Button
                  onClick={handleUserDispute}
                  disabled={isLoading}
                  variant="destructive"
                  className="font-bold text-xs gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  File Formal Appeal to Campus Administration
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Borrower has a 48-hour window to contest this finding if disputed.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. DISPUTED INCIDENT: Admin arbitration */}
      {incident.status === "disputed" && (
        <Card className="border-rose-300 bg-rose-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Step 5: Campus Governance Arbitration</Badge>
              <span className="text-xs text-rose-900 font-semibold">• Contested Finding</span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-1">
              Campus Administrative Dispute Resolution
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              The borrower contested the station manager&apos;s decision. As Campus Administrator, conduct a neutral review and issue a final binding ruling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <div className="space-y-4">
                <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">Borrower Grounds for Appeal:</div>
                  <p className="italic text-slate-700">&quot;{incident.dispute_reason}&quot;</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">Council Ruling:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { val: "upheld", title: "Uphold Manager Finding", desc: "Evidence supports station finding" },
                      { val: "overturned", title: "Overturn Finding", desc: "Exonerate user; clear all penalties" },
                      { val: "compromise", title: "Equitable Compromise", desc: "Split responsibility fairly" },
                      { val: "dismissed", title: "Dismiss with Reprimand", desc: "Close case with advisory warning" },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors ${
                          adminResolution === opt.val
                            ? "border-rose-600 bg-rose-50/60 ring-2 ring-rose-200"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{opt.title}</span>
                          <input
                            type="radio"
                            name="admin_resolution"
                            value={opt.val}
                            checked={adminResolution === opt.val}
                            onChange={() => setAdminResolution(opt.val as any)}
                            className="text-rose-600"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Council Arbitration Rationale (Binding Notes):
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter formal administrative council notes and justification for this ruling..."
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white focus:outline-rose-500 min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={handleAdminResolve}
                  disabled={isLoading}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Issue Final Binding Administrative Ruling
                </Button>
              </div>
            ) : (
              <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  This incident is currently in formal administrative arbitration with the Campus Administrator (Dr. Arthur Vance).
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. COMPLETED ARBITRATION NOTICE */}
      {incident.status === "resolved" && incident.admin_resolution && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Final Campus Governance Ruling Issued
          </div>
          <p className="text-emerald-700 leading-relaxed">
            This case was formally arbitrated by Campus Administration with binding resolution:{" "}
            <strong>{incident.admin_resolution.toUpperCase()}</strong>. Details and notes are preserved in the tamper-evident audit ledger.
          </p>
        </div>
      )}
    </div>
  );
}
