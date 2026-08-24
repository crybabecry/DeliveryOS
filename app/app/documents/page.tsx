import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DocumentUploader from "@/components/DocumentUploader";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase.from("projects").select("id,name,code").order("created_at", { ascending: false });
  const selected = params.project && projects?.some(p => p.id === params.project) ? params.project : projects?.[0]?.id;
  const { data: documents } = selected ? await supabase.from("documents").select("id,name,document_type,status,current_revision,created_at").eq("project_id", selected).order("created_at", { ascending: false }) : { data: [] };
  return <div className="content"><div className="page-header-row"><div><h1 className="page-title">Documents</h1><p className="page-subtitle">Private project documents with revisions and ingestion state.</p></div><Link className="btn" href="/app/projects">Projects</Link></div>{projects?.length ? <div className="card" style={{marginBottom:18}}><form method="get"><label>Project<select className="select" name="project" defaultValue={selected}>{projects.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}</select></label><button className="btn" style={{marginTop:8}}>Open</button></form></div> : null}{selected ? <section className="card" style={{marginBottom:18}}><div className="section-head"><h2>Upload document</h2></div><DocumentUploader projectId={selected}/></section> : null}<section className="card">{documents?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Type</th><th>Revision</th><th>Status</th><th>Created</th></tr></thead><tbody>{documents.map(d=><tr key={d.id}><td>{d.name}</td><td>{d.document_type}</td><td>{d.current_revision}</td><td><span className={`badge ${d.status === "READY" ? "badge-green" : d.status === "PROCESSING" ? "badge-yellow" : "badge-gray"}`}>{d.status}</span></td><td>{new Date(d.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty">No documents yet.</div>}</section></div>;
}
