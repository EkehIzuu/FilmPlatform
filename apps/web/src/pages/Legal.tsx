import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";

type Props = {
  kind: "terms" | "privacy" | "guidelines";
};

const COPY: Record<Props["kind"], { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "Izora connects creators and audiences worldwide through titles, clips, cinema premieres, and live rooms.",
      "Creators retain ownership of uploaded works and grant Izora a non-exclusive license to stream and promote content on the platform.",
      "Users must not upload unlawful, infringing, or harmful material. We may remove content and suspend accounts that violate these terms.",
      "Cinema tickets and reservations are subject to availability. Refund policies will be published when live payments launch.",
      "These terms may change as Izora moves from demo to production. Continued use after updates means acceptance.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect account email, profile details (display name, birth year), and usage events to run the service.",
      "Media uploads are stored in Supabase Storage under your account. We do not sell personal data.",
      "Authentication is handled by Supabase Auth. Session tokens stay in your browser unless you sign out.",
      "Analytics (Plausible or Google Analytics) load only when configured via environment variables.",
      "Contact the operator to request data export or deletion where applicable under local law.",
    ],
  },
  guidelines: {
    title: "Community Guidelines",
    body: [
      "Be respectful in communities, live chat, and reviews. No harassment, hate speech, or spam.",
      "Mark age-restricted titles accurately. Fans must meet minimum age requirements.",
      "Report suspicious content via the report button - moderators review flagged items.",
      "Creators should use accurate titles, descriptions, language labels, region labels, and pricing for cinema events.",
      "Promotional AI copy is a draft - you are responsible for what you publish.",
    ],
  },
};

export function LegalPage({ kind }: Props) {
  const doc = COPY[kind];
  return (
    <div className="page">
      <PageHeader title={doc.title} subtitle="Izora - production legal draft" />
      <article className="card" style={{ maxWidth: "720px" }}>
        {doc.body.map((p) => (
          <p key={p.slice(0, 24)} className="small" style={{ lineHeight: 1.6 }}>
            {p}
          </p>
        ))}
      </article>
      <BackLink to="/profile">Profile</BackLink>
    </div>
  );
}
