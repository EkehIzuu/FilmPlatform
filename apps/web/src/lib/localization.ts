export type LanguageOption = {
  value: string;
  label: string;
};

export const GLOBAL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "arabic", label: "Arabic" },
  { value: "hindi", label: "Hindi" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "german", label: "German" },
  { value: "swahili", label: "Swahili" },
  { value: "pidgin", label: "Pidgin" },
  { value: "yoruba", label: "Yoruba" },
  { value: "igbo", label: "Igbo" },
  { value: "hausa", label: "Hausa" },
];

const LANGUAGE_CODE_TO_VALUE: Record<string, string> = {
  ar: "arabic",
  de: "german",
  en: "english",
  es: "spanish",
  fr: "french",
  ha: "hausa",
  hi: "hindi",
  ig: "igbo",
  ja: "japanese",
  ko: "korean",
  pt: "portuguese",
  sw: "swahili",
  yo: "yoruba",
  zh: "chinese",
};

export type DeviceLocaleInfo = {
  locale: string;
  languageCode: string;
  languageValue: string;
  languageName: string;
  regionCode?: string;
  regionName?: string;
};

export function getDeviceLocaleInfo(): DeviceLocaleInfo {
  const locale =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en-US";
  const [languageCode, regionCode] = locale.split(/[-_]/);
  const languageValue = LANGUAGE_CODE_TO_VALUE[languageCode.toLowerCase()] ?? "english";
  const fallbackLanguageName =
    GLOBAL_LANGUAGE_OPTIONS.find((l) => l.value === languageValue)?.label ?? "English";

  let languageName = fallbackLanguageName;
  let regionName: string | undefined;

  try {
    languageName =
      new Intl.DisplayNames([locale], { type: "language" }).of(languageCode) ??
      fallbackLanguageName;
  } catch {
    languageName = fallbackLanguageName;
  }

  if (regionCode) {
    try {
      regionName = new Intl.DisplayNames([locale], { type: "region" }).of(regionCode);
    } catch {
      regionName = regionCode.toUpperCase();
    }
  }

  return {
    locale,
    languageCode,
    languageValue,
    languageName,
    regionCode: regionCode?.toUpperCase(),
    regionName,
  };
}
