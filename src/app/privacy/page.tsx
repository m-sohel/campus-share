import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          CampusShare Data Governance & Privacy Notice
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Trust, Safety & Privacy Notice
        </h1>
        <p className="text-slate-600 mt-2">
          How CampusShare protects your institutional records, credentials, condition reports, and booking history.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              1. Principles of Institutional Trust
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3 leading-relaxed">
            <p>
              CampusShare bridges university departments and community makerspaces. We operate on the non-negotiable principle of <strong>Human-in-the-Loop Accountability</strong>. Automated eligibility checks verify safety training and certifications, but access decisions, disciplinary penalties, and damage assessments are always decided by verified human administrators or resource owners.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              2. Data We Collect & Why
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3 leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Identity & Institutional Role:</strong> Name, university/makerspace affiliation, and department to establish verified trust.
              </li>
              <li>
                <strong>Safety Certifications & Credentials:</strong> Dates, certification tiers (e.g. Laser Safety Level 2, Cleanroom protocols), and issuing authority to verify machine operation qualifications.
              </li>
              <li>
                <strong>Equipment Condition Logs:</strong> Photographic or checklist evidence recorded during check-in and check-out handovers to prevent disputed damage claims.
              </li>
              <li>
                <strong>Append-Only Audit Trail:</strong> Cryptographically chained logs recording booking lifecycle events to maintain fair access disputes.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              3. Plain-Language Explanation of All Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3 leading-relaxed">
            <p>
              Under our governance charter, no booking request can be rejected, waitlisted, or penalized without a clear, plain-language reason. Users maintain the right to inspect their fair-share score and contest any flag or incident record directly with the designated campus safety officer.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong>FERPA & Data Minimization Compliant:</strong> Student academic records, grades, and external financial details are never requested, stored, or processed by CampusShare.
          </div>
        </div>
      </div>
    </div>
  );
}
