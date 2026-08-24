import { createWorkspace } from "./actions";
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <div className="content narrow"><div style={{marginBottom:22}}><h1 className="page-title">Create workspace</h1><p className="page-subtitle">Your workspace isolates users, projects and documents from other customers.</p></div><div className="card">{params.error ? <div className="notice notice-error">{params.error}</div> : null}<form className="form" action={createWorkspace}><label>Organisation name<input name="organization" required minLength={2} maxLength={200} /></label><label>Organisation slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="acme-manufacturing" /></label><button className="btn btn-primary">Create workspace</button></form></div></div>;
}
