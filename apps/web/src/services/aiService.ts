import {
  generateDubbingLine,
  generatePromoCopy,
  generateSubtitlePreview,
  suggestSmartPriceNgn,
} from "../lib/hackathonAi";

type AudienceDensity = "low" | "medium" | "high";
type NetworkQuality = "2g" | "3g" | "4g" | "wifi";

function openAiKey(): string | undefined {
  return import.meta.env.VITE_OPENAI_API_KEY?.trim() || undefined;
}

async function chatCompletion(system: string, user: string): Promise<string | null> {
  const key = openAiKey();
  if (!key) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export function isRealAiEnabled(): boolean {
  return Boolean(openAiKey());
}

export async function generateSubtitles(input: {
  titleName: string;
  language: string;
  sceneNote: string;
}): Promise<string> {
  const fallback = generateSubtitlePreview(input.titleName, input.language, input.sceneNote);
  const ai = await chatCompletion(
    "You write WebVTT subtitle files for global films and creator videos. Output only valid WebVTT in the requested language.",
    `Title: ${input.titleName}\nLanguage: ${input.language}\nScene: ${input.sceneNote}`,
  );
  return ai || fallback;
}

export async function generateDubbing(input: {
  language: string;
  sceneNote: string;
}): Promise<string> {
  const fallback = generateDubbingLine(input.language, input.sceneNote);
  const ai = await chatCompletion(
    "You write one short dubbing line for global film trailers and creator videos in the requested language.",
    `Language: ${input.language}\nScene: ${input.sceneNote}`,
  );
  return ai || fallback;
}

export async function suggestPricing(input: {
  audienceDensity: AudienceDensity;
  networkQuality: NetworkQuality;
  baselineNgn: number;
}): Promise<{ suggestedNgn: number; dataSaverMode: boolean; rationale?: string }> {
  const fallback = suggestSmartPriceNgn(input);
  const ai = await chatCompletion(
    "You suggest local-currency cinema ticket prices for a global streaming audience. Reply JSON only: {\"suggestedNgn\":number,\"dataSaverMode\":boolean,\"rationale\":string}",
    JSON.stringify(input),
  );
  if (!ai) return fallback;
  try {
    const parsed = JSON.parse(ai) as {
      suggestedNgn?: number;
      dataSaverMode?: boolean;
      rationale?: string;
    };
    if (typeof parsed.suggestedNgn === "number") {
      return {
        suggestedNgn: Math.max(100, Math.round(parsed.suggestedNgn)),
        dataSaverMode: Boolean(parsed.dataSaverMode),
        rationale: parsed.rationale,
      };
    }
  } catch {
    /* use fallback */
  }
  return fallback;
}

export async function generatePromo(input: {
  titleName: string;
  language: string;
  region: string;
  priceNgn: number;
}): Promise<string> {
  const fallback = generatePromoCopy(input);
  const ai = await chatCompletion(
    "You write short social promo copy for global film premieres. One paragraph max, in the requested language.",
    JSON.stringify(input),
  );
  return ai || fallback;
}
