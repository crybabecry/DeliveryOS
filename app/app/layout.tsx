import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="shell"><aside className="sidebar"><div className="brand">DeliveryOS</div><nav className="nav"><Link href="/app">Dashboard</Link><Link href="/app/projects">Projects</Link><Link href="/app/documents">Documents</Link><Link href="/app/requirements">Requirements</Link><Link href="/app/delivery">Delivery</Link><Link href="/app/risks">Risks</Link><Link href="/app/settings/members">Members</Link><Link href="/app/settings/billing">Billing</Link></nav><div className="sidebar-footer">{user.email}<form action="/api/auth/signout" method="post"><button className="sidebar-link" type="submit">Sign out</button></form></div></aside><main className="main"><header className="topbar"><div><strong>Delivery workspace</strong><div className="topbar-note">Commercial / non-sensitive project data only</div></div><Link href="/" className="topbar-link">Public site</Link></header>{children}</main></div>;
}
