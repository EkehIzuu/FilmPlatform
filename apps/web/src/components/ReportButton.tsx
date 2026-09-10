import { FormEvent, useState } from "react";
import type { Report } from "../domain/types";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  targetType: Report["targetType"];
  targetId: string;
  className?: string;
};

export function ReportButton({ targetType, targetId, className = "" }: Props) {
  const { user } = useAuth();
  const { addReport } = useFilmData();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  if (!user) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    addReport(targetType, targetId, reason.trim());
    setReason("");
    setOpen(false);
    setSent(true);
    window.setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className={`report-button-wrap${className ? ` ${className}` : ""}`}>
      <button type="button" className="text-btn" onClick={() => setOpen((v) => !v)}>
        Report
      </button>
      {sent ? <span className="small muted">Report submitted</span> : null}
      {open ? (
        <form className="inline-report card" onSubmit={onSubmit}>
          <label className="small">
            Why are you reporting this?
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              maxLength={500}
            />
          </label>
          <div className="btn-row">
            <button type="submit" className="btn-secondary">
              Submit
            </button>
            <button type="button" className="text-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
