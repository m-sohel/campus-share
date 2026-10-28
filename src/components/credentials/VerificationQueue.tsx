"use client";

import { useState } from "react";
import { Credential, Profile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface VerificationQueueProps {
  initialCredentials: Credential[];
  profiles: Profile[];
  currentUser: Profile;
}

export function VerificationQueue({
  initialCredentials,
  profiles,
  currentUser,
}: VerificationQueueProps) {
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pendingCreds = credentials.filter((c) => c.status === "pending");
  const reviewedCreds = credentials.filter((c) => c.status !== "pending");

  const handleDecision = async (credentialId: string, decision: "approve" | "reject") => {
    const reason =
      reasonInputs[credentialId]?.trim() ||
      (decision === "approve"
        ? "Verified completion of safety training requirements."
        : "Safety prerequisite criteria not met; refresher required.");

    setProcessingId(credentialId);
    setMessage(null);

    try {
      const res = await fetch("/api/credentials/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_id: credentialId,
          decision,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit verification decision.");
      }

      // Update local state
      setCredentials((prev) =>
        prev.map((c) => (c.id === credentialId ? data.credential : c))
      );

      setMessage({
        type: "success",
        text: `Successfully ${decision === "approve" ? "approved" : "rejected"} credential. Recorded in audit log.`,
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error processing decision.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* PENDING QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Pending Verification Requests ({pendingCreds.length})
          </h2>
          <Badge variant="warning" className="font-bold text-xs">
            Human-in-the-Loop Sign-off
          </Badge>
        </div>

        {pendingCreds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Verification Queue Empty</h3>
            <p className="text-xs text-slate-500">
              All submitted student and researcher qualifications have been reviewed!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCreds.map((cred) => {
              const requester = profiles.find((p) => p.id === cred.user_id);
              const isProcessing = processingId === cred.id;

              return (
                <Card key={cred.id} className="border-amber-200 shadow-sm overflow-hidden">
                  <div className="bg-amber-50/60 px-6 py-2.5 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-700" />
                      <span className="font-bold text-slate-900">
                        {requester ? requester.full_name : "User ID: " + cred.user_id.slice(0, 8)}
                      </span>
                      <span className="text-slate-500">
                        ({requester?.email} • {requester?.department})
                      </span>
                    </div>
                    <Badge variant="warning" className="uppercase text-[9px] font-bold">
                      Awaiting Sign-off
                    </Badge>
                  </div>

                  <CardContent className="p-6 space-y-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900">
                          {cred.title}
                        </h4>
                        <span className="font-mono text-slate-500 text-[11px]">
                          Type: {cred.credential_type}
                        </span>
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <strong>Submitted Evidence:</strong> {cred.verification_notes || "No extra notes provided."}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Reason / Review Explanation (Mandatory for audit log):
                      </label>
                      <Input
                        value={reasonInputs[cred.id] || ""}
                        onChange={(e) =>
                          setReasonInputs({ ...reasonInputs, [cred.id]: e.target.value })
                        }
                        placeholder="e.g. Verified certificate ID #4928 on campus LMS, passed 100% on safety quiz."
                        className="bg-white text-xs h-9"
                      />

                      <div className="flex items-center justify-end gap-3 pt-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleDecision(cred.id, "reject")}
                          className="text-xs font-semibold gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject Request
                        </Button>

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleDecision(cred.id, "approve")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve & Grant Clearance
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENTLY VERIFIED HISTORY */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          Verified & Historical Credentials ({reviewedCreds.length})
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Credential</th>
                <th className="p-3">Status</th>
                <th className="p-3">Issued / Expiry</th>
                <th className="p-3">Notes & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reviewedCreds.map((c) => {
                const requester = profiles.find((p) => p.id === c.user_id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <span className="font-semibold text-slate-900 block">
                        {requester?.full_name || c.user_id.slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-slate-500">{requester?.email}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {c.title}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          c.status === "verified"
                            ? "success"
                            : c.status === "expired"
                            ? "warning"
                            : "destructive"
                        }
                        className="uppercase text-[9px] font-bold"
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">
                      <div>Issued: {new Date(c.issued_at).toLocaleDateString()}</div>
                      {c.expires_at && <div>Exp: {new Date(c.expires_at).toLocaleDateString()}</div>}
                    </td>
                    <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">
                      {c.verification_notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

