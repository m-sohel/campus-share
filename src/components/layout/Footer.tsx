import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-dusty-olive-200/80 bg-white py-8 text-xs text-dusty-olive-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-celadon-700" />
          <span className="font-bold text-dusty-olive-950">CampusShare</span>
          <span>— Trusted Academic &amp; Community Makerspace Network</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-dusty-olive-500">
          <Link
            href="/privacy"
            className="hover:text-celadon-800 transition-colors underline underline-offset-4"
          >
            Privacy Notice &amp; Data Rights
          </Link>
          <span className="text-dusty-olive-300">|</span>
          <Link
            href="/judge"
            className="hover:text-celadon-800 transition-colors underline underline-offset-4"
          >
            Hackathon Judge Script
          </Link>
          <span className="text-dusty-olive-300">|</span>
          <span>48h Hackathon Demo</span>
        </div>
      </div>
    </footer>
  );
}
