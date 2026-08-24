import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeAndPersistReadiness } from "@/lib/readiness/service";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase.from("organization_members").select("organization_id,role,organizations(id,name,slug)").order("created_at", { ascending: true });
  if (!memberships?.length) redirect("/app/onboarding");
  const orgIds = memberships.map(m => m.organization_id);
  const { data: projects } = await supabase.from("projects").select("id,name,code,status,target_delivery_date,organization_id").in("organization_id", orgIds).order("created_at", { ascending: false }).limit(30);
  const rows = await Promise.all((projects ?? []).map(async (p) => {
    try {
      const r = await computeAndPersistReadiness(supabase, p.id);
      return { ...p, readiness: r.overallScore, deliveryStatus: r.deliveryStatus, blockerCount: r.blockerCount };
    } catch { return { ...p, readiness: 0, deliveryStatus: "ON_TRACK", blockerCount: 0 }; }
  }));
  const avg = rows.length ? Math.round(rows.reduce((s, p) => s + p.readiness, 0) / rows.length) : 0;
  return <div className="content"><div className="page-header-row"><div><h1 className="page-title">Delivery dashboard</h1><p className="page-subtitle">A cross-project view of contract execution, evidence and acceptance.</p></div><Link className="btn btn-primary" href="/app/projects/new">New project</Link></div><div className="grid grid-4"><div className="card"><div className="metric-label">Active projects</div><div className="metric-value">{rows.filter(p => p.status === "ACTIVE" || p.status === "PLANNING").length}</div></div><div className="card"><div className="metric-label">At risk / blocked</div><div className="metric-value">{rows.filter(p => ["AT_RISK", "BLOCKED"].includes(p.deliveryStatus)).length}</div></div><div className="card"><div className="metric-label">Average readiness</div><div className="metric-value">{avg}%</div></div><div className="card"><div className="metric-label">Workspaces</div><div className="metric-value">{memberships.length}</div></div></div><section className="card" style={{marginTop:18}}><div className="section-head"><h2>Projects</h2><Link className="btn" href="/app/projects">Open all</Link></div>{rows.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Readiness</th><th>Delivery date</th><th>Status</th><th>Blockers</th></tr></thead><tbody>{rows.map(p => <tr key={p.id}><td><Link href={`/app/projects/${p.id}`} className="link-strong">{p.name}</Link><div className="metric-note">{p.code}</div></td><td><div className="progress-cell"><span>{p.readiness}%</span><div className="progress"><span style={{width:`${p.readiness}%`}} /></div></div></td><td>{p.target_delivery_date ?? "—"}</td><td><span className={`badge ${p.deliveryStatus === "BLOCKED" ? "badge-red" : p.deliveryStatus === "AT_RISK" ? "badge-yellow" : p.deliveryStatus === "READY" ? "badge-green" : "badge-gray"}`}>{p.deliveryStatus.replaceAll("_", " ")}</span></td><td>{p.blockerCount}</td></tr>)}</tbody></table></div> : <div className="empty">No projects yet.</div>}</section></div>;
}
