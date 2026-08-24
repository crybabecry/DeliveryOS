import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell"><div className="auth-card"><div className="brand">DeliveryOS</div><h1>Sign in</h1><p className="page-subtitle">Contract-to-delivery workspace for regulated manufacturing teams.</p>{params.error ? <div className="notice notice-error">{params.error}</div> : null}<form className="form" action={login}><label>Email<input type="email" name="email" required autoComplete="email" /></label><label>Password<input type="password" name="password" required autoComplete="current-password" /></label><button className="btn btn-primary">Sign in</button></form><p className="auth-link">No account? <a href="/signup">Create one</a></p></div></main>;
}
