import type { ReactNode } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { BrandLogo } from "./BrandLogo";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: Props) {
  const cloud = isSupabaseConfigured();

  return (
    <main className="auth-page">
      <div className="auth-page-inner">
        <BrandLogo variant="full" />
        <p className="auth-tagline">AI for creators and audiences everywhere</p>

        <section className="auth-card">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle muted">{subtitle}</p>
          {children}
        </section>

        <p className="auth-footnote small muted">
          {cloud
            ? "Accounts saved to Supabase (PostgreSQL)"
            : "Demo mode — add Supabase keys in .env.local for cloud accounts"}
        </p>
      </div>
    </main>
  );
}
