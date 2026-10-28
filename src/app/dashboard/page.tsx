import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/role-guard";

export default async function DashboardRoot() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(`/dashboard/${user.role}`);
}

