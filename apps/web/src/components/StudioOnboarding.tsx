import { Link } from "react-router-dom";
import type { OnboardingStep } from "../lib/studioInsights";

type Props = {
  steps: OnboardingStep[];
};

export function StudioOnboarding({ steps }: Props) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="studio-onboarding">
      <div className="studio-onboarding-head">
        <h2 className="studio-tools-section-label">Get started</h2>
        <span className="small muted">
          {done}/{steps.length}
        </span>
      </div>
      <ul className="studio-onboarding-list">
        {steps.map((step) => (
          <li key={step.id}>
            {step.done ? (
              <span className="studio-onboarding-step studio-onboarding-step--done">
                <span className="studio-onboarding-check" aria-hidden>
                  ✓
                </span>
                {step.label}
              </span>
            ) : (
              <Link to={step.href} className="studio-onboarding-step">
                <span className="studio-onboarding-check studio-onboarding-check--todo" aria-hidden />
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
