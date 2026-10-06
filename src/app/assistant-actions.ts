"use server";

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDosesInRange, formatDoseTiming, type TodaysDose } from "@/lib/schedule";
import { formatDay, formatTime } from "@/lib/timezone";
import { getUserTimeZone } from "@/lib/user-timezone";
import { NO_EM_DASH_INSTRUCTION, stripEmDashes } from "@/lib/llm-text";

const LOOKBACK_DAYS = 90;
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the adherence assistant inside MedTrack, a medication tracking app. Answer the user's questions about their own medication-taking patterns (missed doses, how early or late they take doses, streaks, percentages) using ONLY the adherence data provided below. Be concise and specific, citing dates and medication names where relevant. Do not give medical advice, dosage recommendations, or opinions on the medications themselves, stick to describing the adherence data. If the data provided does not answer the question, say so rather than guessing. ${NO_EM_DASH_INSTRUCTION}`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

type MedicationForContext = {
  id: string;
  name: string;
  amountPerDose: number;
  unit: string;
  times: string[];
};

function buildContext(
  medications: MedicationForContext[],
  doses: TodaysDose<MedicationForContext>[],
  now: Date,
  timeZone: string
): string {
  const byMedicationId = new Map<string, TodaysDose<MedicationForContext>[]>();
  for (const dose of doses) {
    const list = byMedicationId.get(dose.medication.id) ?? [];
    list.push(dose);
    byMedicationId.set(dose.medication.id, list);
  }

  const lines: string[] = [
    `Today's date: ${formatDay(now, timeZone, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    `The data below covers the last ${LOOKBACK_DAYS} days, excluding doses that have not come up yet.`,
    "",
  ];

  for (const medication of medications) {
    const medDoses = (byMedicationId.get(medication.id) ?? []).filter(
      (dose) => dose.status !== "upcoming"
    );
    lines.push(
      `## ${medication.name} (${medication.amountPerDose} ${medication.unit}, scheduled ${medication.times.join(", ")})`
    );
    if (medDoses.length === 0) {
      lines.push("No scheduled doses in range yet.");
    } else {
      for (const dose of medDoses) {
        const dateStr = formatDay(dose.scheduledFor, timeZone, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const timeStr = formatTime(dose.scheduledFor, timeZone);
        if (dose.status === "missed") {
          lines.push(`- ${dateStr} ${timeStr}: missed`);
        } else if (dose.status === "taken" && dose.takenAt) {
          lines.push(
            `- ${dateStr} ${timeStr}: taken (${formatDoseTiming(dose.scheduledFor, dose.takenAt)})`
          );
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function askAdherenceAssistant(
  question: string,
  history: ChatMessage[]
): Promise<{ answer: string } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "You need to be signed in to ask about your adherence." };

  const trimmed = question.trim();
  if (!trimmed) return { error: "Ask a question first." };

  const medications = await prisma.medication.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, amountPerDose: true, unit: true, times: true, daysOfWeek: true, createdAt: true },
  });

  if (medications.length === 0) {
    return {
      answer: "You don't have any medications added yet, so there's no adherence data to look at.",
    };
  }

  const timeZone = await getUserTimeZone(userId);
  const now = new Date();
  const rangeStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const doseLogs = await prisma.doseLog.findMany({
    where: { userId, scheduledFor: { gte: rangeStart, lte: now } },
    select: { medicationId: true, scheduledFor: true, takenAt: true },
  });

  const doses = getDosesInRange(medications, doseLogs, rangeStart, now, now, timeZone);
  const context = buildContext(medications, doses, now, timeZone);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "The assistant isn't configured yet (missing API key)." };

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}\n\n${context}`,
      messages: [
        ...history.map((message) => ({ role: message.role, content: message.content })),
        { role: "user" as const, content: trimmed },
      ],
    });

    const answer = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { answer: stripEmDashes(answer) || "I couldn't come up with an answer to that, try rephrasing." };
  } catch (error) {
    console.error("Adherence assistant request failed", error);
    return { error: "Something went wrong answering that, try again in a moment." };
  }
}
