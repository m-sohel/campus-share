import Link from "next/link";
import { ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-900 dark:text-slate-200">CampusShare</span>
          <span>— Trusted Academic & Makerspace Resource Sharing</span>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <Link
            href="/privacy"
            className="text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline underline-offset-4"
          >
            Privacy Notice & Data Rights
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500">
            Built for 48h Campus Innovation Challenge
          </span>
        </div>
      </div>
    </footer>
  );
}
