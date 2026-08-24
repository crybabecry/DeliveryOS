"use client";
export default function ProjectSelect({ projectId, projects }: { projectId: string; projects: { id: string; name: string; code: string }[] }) {
  return <form method="get"><select className="select" name="project" defaultValue={projectId} onChange={(e) => e.currentTarget.form?.requestSubmit()}><option value="">Select project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></form>;
}
