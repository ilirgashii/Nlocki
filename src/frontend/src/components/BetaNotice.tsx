import { Link } from "@tanstack/react-router";
export function BetaNotice() {
  return (
    <aside className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-center">
      Private beta · Use test data. Avoid sensitive details, medical records and
      identifiable photos.{" "}
      <Link
        to="/legal/$document"
        params={{ document: "privacy" }}
        className="underline"
      >
        Privacy
      </Link>
      {" · "}
      <Link
        to="/legal/$document"
        params={{ document: "terms" }}
        className="underline"
      >
        Beta terms
      </Link>
      {" · "}
      <Link
        to="/legal/$document"
        params={{ document: "impressum" }}
        className="underline"
      >
        Impressum
      </Link>
    </aside>
  );
}
