"use client";

import React, { useState } from "react";
import { AuditLogEntry, UserRole } from "@/types";
import { ChainVerificationResult, verifyAuditChain } from "@/lib/rules/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Link as LinkIcon,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface AuditLogViewerProps {
  initialEntries: AuditLogEntry[];
  actors: { id: string; name: string; role: string }[];
}

export function AuditLogViewer({ initialEntries, actors }: AuditLogViewerProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialEntries);
  const [selectedActor, setSelectedActor] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (selectedActor !== "ALL" && e.actor_id !== selectedActor) return false;
    if (selectedAction !== "ALL" && e.action !== selectedAction) return false;
    if (selectedEntity !== "ALL" && e.resource_type !== selectedEntity) return false;
    return true;
  });

  // Action options
  const actionOptions = Array.from(new Set(entries.map((e) => e.action))).sort();
  const entityOptions = Array.from(new Set(entries.map((e) => e.resource_type))).sort();

  // Handle Verify Integrity Click
  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/audit/verify", { method: "POST" });
      const data = await res.json();

      if (data.success && data.verification) {
        setVerificationResult(data.verification);
      } else {
        // Fallback: run pure client-side verification
        const localCheck = verifyAuditChain(entries);
        setVerificationResult(localCheck);
      }
    } catch {
      const localCheck = verifyAuditChain(entries);
      setVerificationResult(localCheck);
    } finally {
      setIsVerifying(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("APPROVED")) return <Badge className="bg-emerald-600 text-white text-[10px]">{action}</Badge>;
    if (action.includes("REJECTED")) return <Badge variant="destructive" className="text-[10px]">{action}</Badge>;
    if (action.includes("CANCELLED")) return <Badge variant="secondary" className="text-[10px]">{action}</Badge>;
    if (action.includes("REQUESTED")) return <Badge className="bg-indigo-600 text-white text-[10px]">{action}</Badge>;
    return <Badge variant="outline" className="text-[10px]">{action}</Badge>;
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 text-white shadow-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <CardTitle className="text-lg font-bold text-white">
                Cryptographic Audit Log (Append-Only Trail)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Tamper-evident transaction ledger chained with SHA-256 hashes. Database triggers prohibit UPDATE and DELETE.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shrink-0"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Recomputing SHA-256 Hashes...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Verify Chain Integrity</span>
              </>
            )}
          </Button>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs animate-in fade-in ${
              verificationResult.isValid
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/50 border-rose-500/50 text-rose-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {verificationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  {verificationResult.isValid
                    ? "Cryptographic Verification PASSED (100% Tamper-Proof)"
                    : "TAMPERING DETECTED: Chain Integrity Violation!"}
                </span>
                <p>{verificationResult.message}</p>
                {!verificationResult.isValid && (
                  <div className="font-mono text-[11px] p-2 bg-black/40 rounded border border-rose-900 mt-2 space-y-0.5">
                    <div>Broken Index: Block #{verificationResult.brokenIndex}</div>
                    {verificationResult.expectedHash && (
                      <div>Expected Hash: {verificationResult.expectedHash}</div>
                    )}
                    {verificationResult.actualHash && (
                      <div>Recorded Hash: {verificationResult.actualHash}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Filter by Actor
            </label>
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Actors ({actors.length})</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Filter by Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              {actionOptions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Filter by Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              {entityOptions.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3">
          <span>
            Showing <strong className="text-white">{filteredEntries.length}</strong> of{" "}
            {entries.length} chained entries
          </span>
          <span className="font-mono text-[11px] text-slate-500">Algorithm: SHA-256 + Canonical JSON</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No audit log entries match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Justification Reason</th>
                  <th className="p-3">Hash Chain Link</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredEntries.map((e, idx) => {
                  const isExpanded = expandedRowId === e.id;
                  const actor = actors.find((a) => a.id === e.actor_id);
                  const actorLabel = actor?.name || e.actor_role || "User";
                  const dateStr = new Date(e.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <React.Fragment key={e.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                          {idx}
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {dateStr}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-200 block">{actorLabel}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{e.actor_role}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">{getActionBadge(e.action)}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-slate-300 capitalize">{e.resource_type}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {e.resource_id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-200" title={e.reason}>
                          {e.reason}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">{e.prev_hash.slice(0, 8)}...</span>
                            <span className="text-indigo-400">➔</span>
                            <span className="text-emerald-400 font-semibold">{e.hash.slice(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : e.id)}
                            className="p-1 rounded text-indigo-400 hover:text-indigo-200 hover:bg-slate-800"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={8} className="p-4 border-t border-slate-800">
                            <div className="space-y-3 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] space-y-1">
                                  <div className="text-slate-400 uppercase text-[10px] font-bold">
                                    Previous Block Hash:
                                  </div>
                                  <div className="text-slate-300 break-all">{e.prev_hash}</div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 font-mono text-[11px] space-y-1">
                                  <div className="text-emerald-400 uppercase text-[10px] font-bold">
                                    Entry SHA-256 Hash:
                                  </div>
                                  <div className="text-emerald-300 break-all">{e.hash}</div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="font-semibold text-slate-300 block">Recorded State Payload:</span>
                                <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                                  {JSON.stringify(e.new_state, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
