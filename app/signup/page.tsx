import { signup } from "./actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell"><div className="auth-card"><div className="brand">DeliveryOS</div><h1>Create account</h1><p className="page-subtitle">Start with a free workspace for synthetic/non-sensitive project data.</p>{params.error ? <div className="notice notice-error">{params.error}</div> : null}{params.message ? <div className="notice notice-success">{params.message}</div> : null}<form className="form" action={signup}><label>Display name<input name="displayName" maxLength={120} /></label><label>Email<input type="email" name="email" required /></label><label>Password<input type="password" name="password" required minLength={10} /></label><button className="btn btn-primary">Create account</button></form><p className="auth-link">Already registered? <a href="/login">Sign in</a></p></div></main>;
}
