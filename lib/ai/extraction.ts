import OpenAI from "openai";

export const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    requirements: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          source_page: { type: "integer" },
          category: { type: "string" },
          priority: { type: "string", enum: ["CRITICAL", "HIGH", "NORMAL"] },
          mandatory: { type: "boolean" },
          verification_method: { type: "string", enum: ["DOCUMENT_REVIEW","TEST","INSPECTION","CERTIFICATE","ANALYSIS","DEMONSTRATION","NONE"] },
          due_date: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["text","source_page","category","priority","mandatory","verification_method","due_date","confidence"]
      }
    }
  },
  required: ["requirements"]
} as const;

export async function extractRequirementsFromPdf(fileBlob: Blob) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey });
  const arrayBuffer = await fileBlob.arrayBuffer();
  const file = await client.files.create({ file: new File([arrayBuffer], "source.pdf", { type: "application/pdf" }), purpose: "user_data" });
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{ role: "user", content: [
        { type: "input_file", file_id: file.id },
        { type: "input_text", text: "Extract contractual or technical obligations from this document. Only include explicit obligations or acceptance requirements. Preserve exact wording in text. Give the best available page number. Do not invent deadlines, tests or compliance claims; use empty due_date and NONE when absent. Return structured data only." }
      ] }],
      text: { format: { type: "json_schema", name: "contract_requirements", strict: true, schema: extractionSchema as any } }
    });
    const text = response.output_text;
    if (!text) throw new Error("Model returned no structured output.");
    return JSON.parse(text) as { requirements: Array<Record<string, unknown>> };
  } finally {
    await client.files.delete(file.id).catch(() => undefined);
  }
}
