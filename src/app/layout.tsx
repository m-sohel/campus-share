import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth/role-guard";

export const metadata: Metadata = {
  title: "CampusShare — University & Makerspace Resource Sharing",
  description:
    "Trusted resource-sharing platform for high-value university labs, makerspace tools, cameras, and test devices with verified credentials, condition records, and tamper-proof audit trails.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-dusty-olive-50/50 text-dusty-olive-950 font-sans selection:bg-tea-green-200 selection:text-tea-green-950">
        <Navbar currentUser={currentUser} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
