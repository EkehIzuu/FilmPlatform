export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareResult = {
  ok: boolean;
  method?: "share" | "copy";
  error?: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const url = payload.url;
  const text = `${payload.text}\n${url}`.trim();

  try {
    if (navigator.share) {
      await navigator.share({ title: payload.title, text: payload.text, url });
      return { ok: true, method: "share" };
    }
  } catch (e) {
    // User can cancel native share; still offer copy fallback
    const copied = await copyToClipboard(url);
    return {
      ok: copied,
      method: copied ? "copy" : undefined,
      error: e instanceof Error ? e.message : "Share failed",
    };
  }

  const copied = await copyToClipboard(url);
  return { ok: copied, method: copied ? "copy" : undefined, error: copied ? undefined : "Copy failed" };
}

