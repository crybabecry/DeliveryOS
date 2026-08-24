import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function RisksPage() {
  const supabase=await createSupabaseServerClient();
  const {data:projects}=await supabase.from("projects").select("id,name,code").order("created_at",{ascending:false});
  const ids=(projects??[]).map(p=>p.id);
  const {data:risks}=ids.length?await supabase.from("risks").select("id,project_id,type,severity,status,description,due_date,mitigation,created_at").in("project_id",ids).order("created_at",{ascending:false}).limit(250):{data:[]};
  const projectMap=new Map((projects??[]).map(p=>[p.id,p]));
  return <div className="content"><div className="page-header-row"><div><h1 className="page-title">Risks</h1><p className="page-subtitle">Explicit risks are managed separately from automatically calculated readiness blockers.</p></div></div><section className="card">{risks?.length?<table className="table"><thead><tr><th>Project</th><th>Severity</th><th>Status</th><th>Risk</th><th>Due</th></tr></thead><tbody>{risks.map(r=><tr key={r.id}><td>{projectMap.get(r.project_id)?.code}</td><td><span className={`badge ${r.severity==="P0"?"badge-red":r.severity==="P1"?"badge-yellow":"badge-gray"}`}>{r.severity}</span></td><td>{r.status}</td><td><strong>{r.type}</strong><div>{r.description}</div></td><td>{r.due_date??"—"}</td></tr>)}</tbody></table>:<div className="empty">No manually recorded risks yet. The Delivery page shows rule-based blockers automatically.</div>}</section></div>;
}
