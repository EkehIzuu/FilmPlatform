type AudienceDensity = "low" | "medium" | "high";
type NetworkQuality = "2g" | "3g" | "4g" | "wifi";

const LANGUAGE_GREETING: Record<string, string> = {
  english: "Hello everyone,",
  spanish: "Hola a todos,",
  french: "Bonjour a tous,",
  portuguese: "Ola a todos,",
  arabic: "Marhaban everyone,",
  hindi: "Namaste everyone,",
  chinese: "Ni hao everyone,",
  japanese: "Konnichiwa everyone,",
  korean: "Annyeong everyone,",
  german: "Hallo zusammen,",
  swahili: "Hamjambo wote,",
  pidgin: "How far my people,",
  yoruba: "E kaaro gbogbo yin,",
  igbo: "Ndewo ndi oma,",
  hausa: "Sannu da zuwa,",
};

export function generateSubtitlePreview(
  titleName: string,
  language: string,
  sceneNote: string,
) {
  const cleanTitle = titleName.trim() || "Untitled Film";
  const note = sceneNote.trim() || "A heartfelt moment for audiences everywhere.";
  const greeting = LANGUAGE_GREETING[language] ?? LANGUAGE_GREETING.english;
  return [
    "WEBVTT",
    "",
    "00:00:00.000 --> 00:00:03.400",
    `${greeting} this is a preview from ${cleanTitle}.`,
    "",
    "00:00:03.500 --> 00:00:07.000",
    note,
    "",
    "00:00:07.100 --> 00:00:10.500",
    "Created with Izora AI Subtitle Assistant.",
  ].join("\n");
}

export function generateDubbingLine(language: string, sceneNote: string) {
  const note = sceneNote.trim() || "We made this film to inspire young creators.";
  const opener = LANGUAGE_GREETING[language] ?? LANGUAGE_GREETING.english;
  return `${opener} ${note}`;
}

export function suggestSmartPriceNgn(input: {
  audienceDensity: AudienceDensity;
  networkQuality: NetworkQuality;
  baselineNgn: number;
}) {
  const base = Math.max(100, Math.round(input.baselineNgn));
  const demandMultiplier =
    input.audienceDensity === "high" ? 1.2 : input.audienceDensity === "medium" ? 1 : 0.82;
  const networkMultiplier =
    input.networkQuality === "2g"
      ? 0.75
      : input.networkQuality === "3g"
        ? 0.88
        : input.networkQuality === "4g"
          ? 1
          : 1.08;

  const suggestedNgn = Math.max(100, Math.round((base * demandMultiplier * networkMultiplier) / 10) * 10);
  const dataSaverMode = input.networkQuality === "2g" || input.networkQuality === "3g";
  return { suggestedNgn, dataSaverMode };
}

export function generatePromoCopy(input: {
  titleName: string;
  language: string;
  region: string;
  priceNgn: number;
}) {
  const title = input.titleName.trim() || "Our New Film";
  const region = input.region.trim() || "your city";
  const price = Math.max(100, Math.round(input.priceNgn));

  const templates: Record<string, string> = {
    english: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency. Bring your people and share this post.`,
    spanish: `${title} ya esta disponible en ${region}. Miralo esta noche desde ${price} en tu moneda local. Invita a tu gente y comparte.`,
    french: `${title} est disponible a ${region}. Regardez ce soir des ${price} dans votre monnaie locale. Invitez vos proches et partagez.`,
    portuguese: `${title} chegou a ${region}. Assista hoje a partir de ${price} na sua moeda local. Chame sua gente e compartilhe.`,
    arabic: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency and share it with your community.`,
    hindi: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency and share it with your people.`,
    chinese: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency and share it with your friends.`,
    japanese: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency and share it with your community.`,
    korean: `${title} is now showing in ${region}. Watch tonight from ${price} in your local currency and share it with your friends.`,
    german: `${title} lauft jetzt in ${region}. Schau heute Abend ab ${price} in deiner lokalen Wahrung und teile es mit deinen Leuten.`,
    swahili: `${title} sasa inaonyeshwa ${region}. Tazama leo kuanzia ${price} kwa sarafu yako ya karibu. Waite watu wako na usambaze.`,
    pidgin: `${title} don drop for ${region}. Watch am tonight from ${price} for your local money. Gather your guys make una enjoy am together.`,
    yoruba: `${title} ti de ni ${region}. E wo o lonii lati ${price} ninu owo agbegbe yin. E pe awon eniyan yin ki e si pin iroyin naa.`,
    igbo: `${title} eruola na ${region}. Lelee ya taa site na ${price} n'ego obodo gi. Kpoo ndi unu ma kesaa ozi a.`,
    hausa: `${title} ya iso ${region}. Kalli shi yau daga ${price} a kudin yankinku. Gayyato mutanen ku kuma ku yada sakon nan.`,
  };

  return templates[input.language] ?? templates.english;
}
