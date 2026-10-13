import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
export default function LegalPage() {
  const { document } = useParams({ from: "/legal/$document" });
  const [operator, setOperator] = useState({
    operatorName: "Not configured — development only",
    contact: "",
    country: "DE",
    address: "",
  });
  useEffect(() => {
    fetch("/api/legal/config")
      .then((r) => r.json())
      .then(setOperator)
      .catch(() => {});
  }, []);
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 space-y-5">
      <Link to="/" className="underline">
        Back to app
      </Link>
      <h1 className="text-3xl font-bold">
        {document === "impressum"
          ? "Impressum / Legal notice"
          : document === "terms"
            ? "Beta terms of use"
            : "Privacy notice"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Version 2026-10-13-beta-1 · Operator: {operator.operatorName} ·{" "}
        {operator.country}{" "}
        {operator.contact && (
          <>
            {" "}
            · Contact:{" "}
            <a href={`mailto:${operator.contact}`} className="underline">
              {operator.contact}
            </a>
          </>
        )}
      </p>
      {document === "impressum" ? (
        <>
          <p>Operator: {operator.operatorName}</p>
          <p>
            Postal address:{" "}
            {operator.address || "Not configured — public launch blocked"}
          </p>
          <p>Email: {operator.contact || "Not configured"}</p>
          <p>
            Operator established in Germany. Add registration, VAT and other
            applicable disclosures after German legal review. This development
            draft is not a completed Impressum.
          </p>
        </>
      ) : document === "terms" ? (
        <>
          <p>
            This is an experimental beta for adults aged 18 or older. Features
            and calorie estimates may be incomplete or inaccurate. Use test data
            and avoid health diagnoses, medical records, identity documents and
            identifiable photos while testing.
          </p>
          <p>
            The app is not medical advice or a medical device. Do not use it to
            diagnose, treat, or make medical or dietary decisions. You remain
            free to stop using the service, export your data or delete your
            account.
          </p>
          <p>
            Do not upload another person's data, unlawful content or images you
            do not have permission to use. Keep login credentials and recovery
            codes private. Report security concerns privately to the operator.
          </p>
          <p>
            We do not promise uninterrupted operation or that all
            vulnerabilities have been eliminated. Beta status does not remove
            the operator's data-protection duties. Nothing in these terms
            excludes mandatory consumer rights, statutory data-protection rights
            or liability that applicable law does not permit us to exclude.
          </p>
          <p>
            These terms are a draft pending jurisdiction-specific legal review.
            Public launch requires completed operator/contact details and the
            deployment/privacy review.
          </p>
        </>
      ) : (
        <>
          <p>
            We process email, password hashes, account identifiers and necessary
            session information to provide and protect your account. Your
            optional profile, tasks, posts and messages are processed to deliver
            the features you request. The intended legal basis is contract under
            Article 6(1)(b) GDPR; proportionate security measures use legitimate
            interests under Article 6(1)(f), subject to a documented assessment.
          </p>
          <p>
            Fitness, weight and nutrition entries may reveal health information.
            These optional features require separate explicit consent (Articles
            6(1)(a) and 9(2)(a)). Declining does not prevent using tasks or
            social features. You can withdraw this consent in Account privacy;
            withdrawal removes these entries and prevents further collection. It
            does not affect the lawfulness of earlier consent-based processing.
          </p>
          <p>
            Your profile starts private. Private posts and photos are restricted
            to your account; messages are accessible to conversation
            participants. Choosing a public profile shares its public
            fields/posts with other signed-in app users. Never put sensitive
            information in posts or messages.
          </p>
          <p>
            Storage is controlled by the operator: PostgreSQL for
            account/application data, separate private storage for photos.
            Necessary HttpOnly cookies support login and security; theme
            preferences are stored in your browser. The app includes no
            advertising or marketing analytics. Infrastructure providers,
            including Cloudflare and the email provider, may process connection
            metadata; their actual contracts, locations and transfer safeguards
            must be documented before launch.
          </p>
          <p>
            Account data is retained while the account is active. Expired
            sessions/codes are cleaned up; security event records have a 30-day
            limit. Account deletion removes active application data and photos,
            subject to limited obligations required by law. Encrypted backups
            must expire within 30 days. A deletion ledger is reapplied before a
            backup restore is reopened to users; deletion from backups is
            completed when those copies expire.
          </p>
          <p>
            You can export your account data, withdraw optional consent or
            delete your account in Account privacy. Contact the operator to
            request access, rectification, restriction or portability, or to
            object to legitimate-interest processing. Requests are generally
            answered within one month, with lawful extensions explained. You may
            complain to the competent supervisory authority; for the German
            operator, the competent state data-protection authority depends on
            the federal state where the operator is established. Its name and
            contact must be supplied before launch.
          </p>
          <p>
            Country-based access controls are approximate and do not prevent VPN
            access. They do not determine citizenship or remove GDPR
            obligations. Contact details, processors, lawful-basis assessments,
            sensitive-data treatment and international transfers require legal
            review before real public use.
          </p>
        </>
      )}
    </main>
  );
}
