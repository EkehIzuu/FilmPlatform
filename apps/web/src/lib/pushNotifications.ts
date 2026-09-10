/** Browser notifications + in-tab toasts when the app is backgrounded. */

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showLocalNotification(
  title: string,
  options?: { body?: string; tag?: string; href?: string; whenVisible?: boolean },
): void {
  if (!pushSupported() || Notification.permission !== "granted") return;
  if (!options?.whenVisible && document.visibilityState === "visible") return;

  const n = new Notification(title, {
    body: options?.body,
    tag: options?.tag,
    icon: "/icons/icon-192.png",
  });
  n.onclick = () => {
    window.focus();
    if (options?.href) {
      window.location.href = options.href;
    }
    n.close();
  };
}
