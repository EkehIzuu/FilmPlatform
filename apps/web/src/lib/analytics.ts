declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string): void {
  if (typeof window.plausible === "function") {
    window.plausible("pageview", { props: { path } });
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", { page_path: path });
  }
}

export function trackProductEvent(name: string, props?: Record<string, string | number>): void {
  if (typeof window.plausible === "function") {
    window.plausible(name, props ? { props } : undefined);
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", name, props ?? {});
  }
}

export function initAnalytics(): void {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
  if (plausibleDomain && !document.querySelector("[data-plausible]")) {
    const s = document.createElement("script");
    s.defer = true;
    s.dataset.plausible = "true";
    s.src = "https://plausible.io/js/script.js";
    s.setAttribute("data-domain", plausibleDomain);
    document.head.appendChild(s);
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (gaId && !document.querySelector("[data-ga]")) {
    const loader = document.createElement("script");
    loader.async = true;
    loader.dataset.ga = "true";
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(loader);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId);
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}
