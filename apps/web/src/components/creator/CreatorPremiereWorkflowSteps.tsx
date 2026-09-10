type Step = {
  status: string;
  title: string;
  detail: string;
};

const STEPS: Step[] = [
  {
    status: "Setup",
    title: "Build the ticket page",
    detail: "Set showtime, seats, price, and synced videos.",
  },
  {
    status: "Check",
    title: "Preview the room",
    detail: "Open the screening room as fans will see it.",
  },
  {
    status: "Launch",
    title: "Share with fans",
    detail: "Fans buy tickets, join at showtime, watch on your profile after.",
  },
];

export function CreatorPremiereWorkflowSteps() {
  return (
    <section className="creator-premiere-steps" aria-label="Premiere setup checklist">
      <div className="creator-premiere-steps-head">
        <strong>Premiere setup</strong>
        <span className="small muted">Follow these before sharing the ticket link.</span>
      </div>
      <ul className="creator-premiere-step-list">
        {STEPS.map((s) => (
          <li key={s.status} className="creator-premiere-step">
            <span className="creator-premiere-step-status">{s.status}</span>
            <span>
              <strong>{s.title}</strong>
              <span className="small muted"> - {s.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
