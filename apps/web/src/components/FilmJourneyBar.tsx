import { FILM_JOURNEY_STEPS, stepIndex, type FilmJourneyStep } from "../lib/filmJourney";

type Props = {
  activeStep: FilmJourneyStep;
  compact?: boolean;
};

export function FilmJourneyBar({ activeStep, compact }: Props) {
  const activeIdx = stepIndex(activeStep);

  return (
    <nav
      className={`film-journey-bar${compact ? " film-journey-bar--compact" : ""}`}
      aria-label="How watching works"
    >
      <ol className="film-journey-steps">
        {FILM_JOURNEY_STEPS.map((step, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <li
              key={step.id}
              className={`film-journey-step${done ? " film-journey-step--done" : ""}${
                current ? " film-journey-step--current" : ""
              }`}
            >
              <span className="film-journey-step-num" aria-hidden>
                {done ? "✓" : i + 1}
              </span>
              <span className="film-journey-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
