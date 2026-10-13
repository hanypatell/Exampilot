import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// One place that talks to the AI. Every feature calls generateJSON(),
// so switching between Claude and Gemini is just the AI_PROVIDER env variable.

export type AIImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

type GenerateOptions<T extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: T;
  images?: AIImage[];
  /** How hard the model should think: "low" for quick tasks, "high" for solving problems. */
  effort?: "low" | "medium" | "high";
};

export class AIError extends Error {}

function provider(): "claude" | "gemini" {
  const chosen = process.env.AI_PROVIDER?.toLowerCase();
  if (chosen === "claude" || chosen === "gemini") return chosen;
  return process.env.ANTHROPIC_API_KEY ? "claude" : "gemini";
}

export async function generateJSON<T extends z.ZodType>(opts: GenerateOptions<T>): Promise<z.infer<T>> {
  return provider() === "claude" ? generateWithClaude(opts) : generateWithGemini(opts);
}

// ───────────── Claude ─────────────

let anthropic: Anthropic | null = null;

async function generateWithClaude<T extends z.ZodType>(opts: GenerateOptions<T>): Promise<z.infer<T>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AIError("ANTHROPIC_API_KEY is missing in .env.local");
  anthropic ??= new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-opus-5-5";
  // If a request is declined by a safety check, retry it on a fallback model
  // automatically. Haiku has no server-side fallback, so skip it there.
  const useFallback = !model.includes("haiku");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(opts.images ?? []).map(
      (img): Anthropic.Beta.BetaImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mimeType, data: img.base64 },
      }),
    ),
    { type: "text", text: opts.prompt },
  ];

  try {
    const response = await anthropic.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: opts.system,
      messages: [{ role: "user", content }],
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    if (response.stop_reason === "refusal") throw new AIError("The AI declined this request. Try rephrasing it.");
    if (response.stop_reason === "max_tokens") throw new AIError("The answer was too long. Try a smaller input.");
    if (!response.parsed_output) throw new AIError("The AI returned an unexpected format. Please try again.");
    return response.parsed_output as z.infer<T>;
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new AIError("Your Claude API key is invalid.");
    if (error instanceof Anthropic.RateLimitError) throw new AIError("Too many requests. Wait a minute and retry.");
    if (error instanceof Anthropic.BadRequestError) throw new AIError(`AI request rejected: ${error.message}`);
    if (error instanceof Anthropic.APIError) throw new AIError(`AI service error (${error.status}). Please retry.`);
    throw error;
  }
}

// ───────────── Gemini ─────────────

let gemini: GoogleGenAI | null = null;

async function generateWithGemini<T extends z.ZodType>(opts: GenerateOptions<T>): Promise<z.infer<T>> {
  if (!process.env.GEMINI_API_KEY) throw new AIError("GEMINI_API_KEY is missing in .env.local");
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete jsonSchema.$schema;

  let text: string | undefined;
  try {
    const response = await gemini.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [
            ...(opts.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
            { text: opts.prompt },
          ],
        },
      ],
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });
    text = response.text;
  } catch (error) {
    throw new AIError(`Gemini error: ${error instanceof Error ? error.message : String(error)}`);
  }

  const parsed = opts.schema.safeParse(JSON.parse(text ?? "null"));
  if (!parsed.success) throw new AIError("The AI returned an unexpected format. Please try again.");
  return parsed.data;
}
