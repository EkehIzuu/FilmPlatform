import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";

export function NotFound() {
  return (
    <div className="page">
      <PageHeader
        title="Page not found"
        subtitle="That path doesn’t exist in Film yet."
      />
      <BackLink to="/">Home</BackLink>
    </div>
  );
}
