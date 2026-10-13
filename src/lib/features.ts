import "server-only";
import { z } from "zod";
import { generateJSON, type AIImage } from "./ai";

// Every AI feature of ExamPilot: a schema (what we want back) + a prompt.

const PLAIN_TEXT_RULE =
  "Write plain text only: no Markdown, no LaTeX. For maths use Unicode (x², √, π, ≤, →, ∫) and put each step on its own line.";

// ───────────── 1. Syllabus → topics ─────────────

const SyllabusSchema = z.object({
  units: z.array(
    z.object({
      unit: z.string().describe("Unit or module title, e.g. 'Unit 2: Process Management'"),
      topics: z.array(
        z.object({
          name: z.string().describe("Short topic name, 2-8 words"),
          importance: z.number().int().describe("1 (rarely asked) to 5 (asked in almost every exam)"),
        }),
      ),
    }),
  ),
});
export type SyllabusTopics = z.infer<typeof SyllabusSchema>;

export async function extractTopics(subject: string, material: string) {
  return generateJSON({
    system:
      "You are an expert university exam planner. You turn syllabi into a clean list of study topics and estimate how important each topic is for the exam.",
    prompt: `Subject: ${subject}

Below is the student's material. It may contain a syllabus and sometimes past exam papers.

Return the units and topics in syllabus order.
- Merge tiny sub-points into meaningful topics: aim for 3–8 topics per unit and at most 40 topics overall.
- Importance 1–5: if past papers are included, base it on how often each topic appears in them. Otherwise use your knowledge of what is typically asked in exams for this subject.

<material>
${material.slice(0, 120_000)}
</material>`,
    schema: SyllabusSchema,
    effort: "low",
  });
}

// ───────────── 2. Photo of a question → step-by-step solution ─────────────

const SolutionSchema = z.object({
  readable: z.boolean().describe("false if the photo does not contain a readable question"),
  question_text: z.string().describe("The question exactly as written in the photo"),
  topic: z.string().describe("Exactly one name from the provided topic list, or 'none' if nothing fits"),
  key_concept: z.string().describe("The one idea the student needs to understand, in 1-2 sentences"),
  steps: z.array(z.object({ title: z.string(), explanation: z.string() })),
  final_answer: z.string(),
  common_mistake: z.string().describe("A mistake students often make on this kind of question"),
  similar_questions: z.array(z.object({ question: z.string(), hint: z.string(), answer: z.string() })),
});
export type Solution = z.infer<typeof SolutionSchema>;

export async function solveDoubt(image: AIImage, topics: string[], note: string) {
  return generateJSON({
    system: `You are a patient, brilliant tutor. You solve the student's question step by step so they understand the method, not just the answer. ${PLAIN_TEXT_RULE}`,
    prompt: `The photo contains a question the student is stuck on.
${note ? `The student says: "${note}"\n` : ""}
1. Read the question from the photo.
2. Solve it in clear, numbered steps (usually 3–7 steps).
3. Pick the matching topic from this list (or "none"):
${topics.length ? topics.map((t) => `- ${t}`).join("\n") : "(no topics yet)"}
4. Write exactly 3 similar practice questions of the same difficulty, each with a hint and a short answer.`,
    images: [image],
    schema: SolutionSchema,
    effort: "high",
  });
}

// ───────────── 3. Chat with notes (answers with page citations) ─────────────

const AnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({ document: z.string(), page: z.number().int() })),
  found_in_notes: z.boolean().describe("false if the notes did not contain the answer"),
});
export type NotesAnswer = z.infer<typeof AnswerSchema>;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type PageExcerpt = { document: string; page: number; content: string };

export async function answerFromNotes(subject: string, question: string, history: ChatTurn[], pages: PageExcerpt[]) {
  const excerpts = pages
    .map((p) => `<page document="${p.document}" number="${p.page}">\n${p.content}\n</page>`)
    .join("\n\n");
  const conversation = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Student" : "Tutor"}: ${t.content}`)
    .join("\n");

  return generateJSON({
    system: `You are a study assistant for the subject "${subject}". Answer using the student's own notes, which are given as pages. ${PLAIN_TEXT_RULE}`,
    prompt: `<notes>
${excerpts || "(no notes uploaded yet)"}
</notes>

${conversation ? `Conversation so far:\n${conversation}\n\n` : ""}Student's question: ${question}

Rules:
- Base the answer on the notes and list every page you used in "sources".
- If the notes don't cover it, set found_in_notes to false, say so in one line, then answer briefly from general knowledge.
- Explain simply, like a senior student would, with an example where it helps.`,
    schema: AnswerSchema,
    effort: "low",
  });
}

// ───────────── 4. Quiz + flashcards for a topic ─────────────

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).describe("Exactly 4 options"),
      correct_index: z.number().int().describe("0-3"),
      explanation: z.string(),
    }),
  ),
  flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
});
export type Quiz = z.infer<typeof QuizSchema>;

export async function makeQuiz(subject: string, topic: string, notes: string) {
  return generateJSON({
    system: `You write exam-style practice questions for university students. ${PLAIN_TEXT_RULE}`,
    prompt: `Subject: ${subject}
Topic: ${topic}
${notes ? `\nUse these excerpts from the student's notes where relevant:\n<notes>\n${notes.slice(0, 30_000)}\n</notes>\n` : ""}
Create:
- 5 multiple-choice questions that test understanding (not just definitions), going from easy to hard. Exactly 4 options each, with one correct answer and a short explanation.
- 6 flashcards (front: a term or question, back: a short answer).`,
    schema: QuizSchema,
    effort: "low",
  });
}
