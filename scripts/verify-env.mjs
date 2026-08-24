const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const optionalForAI = ["OPENAI_API_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exitCode = 1;
  }
}
for (const key of optionalForAI) {
  if (!process.env[key]) console.warn(`AI document extraction disabled: ${key} is not set.`);
}
