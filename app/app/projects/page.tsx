import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase.from("organization_members").select("organization_id").limit(1);
  const orgId = members?.[0]?.organization_id;
  if (!orgId) redirect("/app/onboarding");
  const { data: projects } = await supabase.from("projects").select("id,name,code,status,target_delivery_date,description,created_at").eq("organization_id", orgId).order("created_at", { ascending: false });
  return <div className="content"><div className="page-header-row"><div><h1 className="page-title">Projects</h1><p className="page-subtitle">Each project is the root of a contract-to-delivery traceability graph.</p></div><Link className="btn btn-primary" href="/app/projects/new">New project</Link></div><section className="card">{projects?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Status</th><th>Target delivery</th><th>Created</th></tr></thead><tbody>{projects.map(p => <tr key={p.id}><td><Link className="link-strong" href={`/app/projects/${p.id}`}>{p.name}</Link><div className="metric-note">{p.code}</div></td><td><span className="badge badge-gray">{p.status}</span></td><td>{p.target_delivery_date ?? "—"}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty">No projects yet.</div>}</section></div>;
}
