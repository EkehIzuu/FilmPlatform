import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { MyTicketsPanel } from "../components/MyTicketsPanel";

type Props = {
  embedded?: boolean;
};

export function MyTicketsPage({ embedded }: Props) {
  return (
    <div className={embedded ? "watch-panel" : "page my-tickets-page"}>
      {embedded ? null : (
        <PageHeader
          title="My tickets"
          subtitle="Your premiere seats — join when the clock starts, then watch on profile after curtain."
        />
      )}
      <MyTicketsPanel />
      <p className="small muted" style={{ marginTop: "1rem" }}>
        <Link to="/premiere/join" className="text-link">
          Redeem a friend&apos;s share code
        </Link>
        {" · "}
        <Link to="/watch/premiere" className="text-link">
          Buy more tickets
        </Link>
      </p>
    </div>
  );
}
