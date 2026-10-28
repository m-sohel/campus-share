import { getCurrentUser } from "@/lib/auth/role-guard";
import { JudgeConsole } from "@/components/judge/JudgeConsole";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Judge Evaluation & 10-Step Lifecycle Script | CampusShare",
  description:
    "Evaluate CampusShare in under 5 minutes with one-click role switching and step-by-step deep links across all 10 lifecycle steps.",
};

export default async function JudgePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <JudgeConsole initialUser={user} />
      </div>
    </div>
  );
}

