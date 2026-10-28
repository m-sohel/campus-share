"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEED_USERS } from "@/lib/data/seed-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
  Wrench,
  Layers,
  Building,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [affiliation, setAffiliation] = useState("university");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (targetEmail?: string, targetPassword?: string) => {
    const activeEmail = targetEmail || email;
    const activePassword = targetPassword || password;

    if (!activeEmail || !activePassword) {
      setError("Please provide both email and password.");
      return;
    }

    if (mode === "signup" && !fullName) {
      setError("Please provide your full name to create an account.");
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const payload =
      mode === "signup"
        ? { email: activeEmail, password: activePassword, full_name: fullName, affiliation }
        : { email: activeEmail, password: activePassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        router.push(data.redirectUrl || "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network or server connection failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (user: (typeof SEED_USERS)[0]) => {
    setMode("login");
    setEmail(user.email);
    setPassword(user.password);
    handleSubmit(user.email, user.password);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-celadon-100 text-celadon-900 border border-soft-celadon-200/80 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-celadon-700" />
          Verified Campus &amp; Makerspace Auth
        </div>
        <h1 className="text-3xl font-extrabold text-dusty-olive-950 tracking-tight">
          {mode === "login" ? "Sign In to CampusShare" : "Create CampusShare Account"}
        </h1>
        <p className="text-sm text-dusty-olive-600 mt-2 leading-relaxed">
          Access institutional labs, fabrication machinery, media kits, and test benches with verified credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Form */}
        <div className="lg:col-span-5">
          <Card className="shadow-xs border-dusty-olive-200/90 overflow-hidden">
            {/* Mode Selector Tabs */}
            <div className="flex border-b border-dusty-olive-200 bg-dusty-olive-50/50 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mode === "login"
                    ? "bg-white text-celadon-800 shadow-xs border border-dusty-olive-200"
                    : "text-dusty-olive-600 hover:text-dusty-olive-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mode === "signup"
                    ? "bg-white text-celadon-800 shadow-xs border border-dusty-olive-200"
                    : "text-dusty-olive-600 hover:text-dusty-olive-900"
                }`}
              >
                Create Account (Sign Up)
              </button>
            </div>

            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-xl text-dusty-olive-950">
                {mode === "login" ? "Welcome Back" : "New Member Registration"}
              </CardTitle>
              <CardDescription className="text-dusty-olive-500">
                {mode === "login"
                  ? "Enter your institutional email to access your console."
                  : "Register as a borrower to request equipment access."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="space-y-4"
              >
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-900 text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="name-input"
                        className="text-xs font-semibold text-dusty-olive-800 uppercase tracking-wide flex items-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5 text-dusty-olive-500" />
                        Full Name
                      </label>
                      <Input
                        id="name-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Kasim Shah"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="affil-input"
                        className="text-xs font-semibold text-dusty-olive-800 uppercase tracking-wide flex items-center gap-1.5"
                      >
                        <Building className="w-3.5 h-3.5 text-dusty-olive-500" />
                        Affiliation
                      </label>
                      <select
                        id="affil-input"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        className="w-full text-sm border border-dusty-olive-200 rounded-md p-2 bg-white text-dusty-olive-900 focus:outline-none focus:ring-2 focus:ring-celadon-500"
                      >
                        <option value="university">University Student / Researcher</option>
                        <option value="makerspace">Community Makerspace Member</option>
                        <option value="startup">Early-Stage Hardware Startup</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="email-input"
                    className="text-xs font-semibold text-dusty-olive-800 uppercase tracking-wide flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-dusty-olive-500" />
                    Email Address
                  </label>
                  <Input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@campusshare.edu"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password-input"
                    className="text-xs font-semibold text-dusty-olive-800 uppercase tracking-wide flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-dusty-olive-500" />
                    Password
                  </label>
                  <Input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min 8 characters" : "••••••••••••"}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-medium bg-celadon-700 hover:bg-celadon-800 text-white shadow-xs"
                >
                  {loading
                    ? "Processing..."
                    : mode === "login"
                    ? "Sign In to Console"
                    : "Create Verified Account"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="pt-2 text-center text-xs text-dusty-olive-500">
                  <span>Protected by rate limiting &amp; append-only audit trail.</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Judge / 1-Click Evaluation Switcher */}
        <div className="lg:col-span-7">
          <Card className="border-dusty-olive-200/90 bg-gradient-to-br from-soft-celadon-50/50 via-white to-dusty-olive-50/30 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-dusty-olive-950">
                  <Sparkles className="w-4 h-4 text-celadon-700" />
                  1-Click Seeded Persona Switcher
                </CardTitle>
                <Badge variant="accent" className="text-xs font-medium">
                  Judge Testing Mode
                </Badge>
              </div>
              <CardDescription className="text-dusty-olive-500">
                Click any seeded account below to test its role-specific dashboard and permissions immediately:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {SEED_USERS.map((user) => {
                let badgeVariant: "destructive" | "default" | "warning" | "secondary" = "secondary";
                let icon = <UserCheck className="w-4 h-4 text-celadon-700" />;

                if (user.role === "admin") {
                  badgeVariant = "destructive";
                  icon = <ShieldCheck className="w-4 h-4 text-rose-600" />;
                } else if (user.role === "owner") {
                  badgeVariant = "default";
                  icon = <Layers className="w-4 h-4 text-celadon-700" />;
                } else if (user.role === "manager") {
                  badgeVariant = "warning";
                  icon = <Wrench className="w-4 h-4 text-amber-600" />;
                }

                return (
                  <button
                    key={user.email}
                    onClick={() => selectPersona(user)}
                    disabled={loading}
                    className="w-full text-left p-3 rounded-xl border border-dusty-olive-200/90 bg-white hover:border-celadon-400 hover:shadow-xs transition flex items-center justify-between group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-dusty-olive-50 group-hover:bg-soft-celadon-100 transition shrink-0">
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-dusty-olive-950 truncate">
                            {user.full_name}
                          </span>
                          <Badge variant={badgeVariant} className="uppercase text-[9px] px-1.5 py-0 font-bold">
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-dusty-olive-500 truncate">
                          {user.department} ({user.affiliation})
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-celadon-700 group-hover:translate-x-0.5 transition font-semibold shrink-0 ml-2">
                      Sign in &rarr;
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
