# German operator: launch review and incident procedure

These are engineering controls and draft notices, not a legal opinion or an assurance of GDPR compliance. A beta label or acceptance checkbox cannot waive GDPR duties, breach compensation, mandatory consumer rights, or non-excludable liability. Have a German GDPR lawyer review the actual operation before admitting real users.

## Before real data

- Complete operator name, serviceable postal address and monitored privacy email. Germany: review Impressum requirements under DDG §5, and applicable registration/VAT/representative disclosures. Determine the competent Landesdatenschutzbehörde from the operator's Bundesland; publish its contact in the privacy notice.
- Record actual purposes, categories, recipients, retention and lawful bases (GDPR Arts. 5, 6, 13, 30). Document legitimate-interest balancing for proportionate security. Fitness/nutrition/weight can reveal health data: obtain separate freely given explicit consent under Arts. 6(1)(a), 9(2)(a); avoid medical diagnoses entirely. Tasks/social remain usable without this consent. Assess DPIA necessity under Art. 35 before scaling or combining sensitive data.
- Sign processor agreements under Art. 28 with Cloudflare, email and backup providers; document countries, subprocessors and international transfer safeguards. EU-only IP access does not ensure EU-only processing. Review TDDDG §25 for strictly necessary cookies and add prior consent before optional trackers; currently no marketing analytics are included.
- Review beta terms, age-18 policy and copyright/content handling. Avoid identifiable photos and real sensitive information during testing. Access controls cannot establish a user's age or make data anonymous.
- Confirm email delivery, passkeys, TOTP/recovery, consent withdrawal, export including photos, account deletion, encrypted backup expiry and restore deletion reconciliation in the deployed environment. Use private allowlisted test accounts first.
- Enable PUBLIC_BETA_READY only after the above review, filled notices and infrastructure tests. The switch records an operator decision; it is not compliance certification.

## Data requests and retention

Provide a monitored request channel. Verify identity proportionately without collecting identity documents by default. Track requests; normally respond within one month (Art. 12), documenting any lawful extension. Include access, rectification, erasure, restriction, portability and objection. Explain legitimate legal retention exceptions; do not promise absolute immediate removal from every backup.

Active account deletion removes its database records and private files. Keep a minimal keyed deletion ledger solely to prevent resurrection after restore, with documented retention and access restrictions. Offline encrypted backup copies must expire within a maximum 30 days; automate and monitor this policy. Reapply the latest independent deletion ledger before reopening any restore. A ledger is pseudonymous, not necessarily anonymous. Review its own lawful basis and retention.

Security events expire after 30 days. Review infrastructure access logs and SMTP/Cloudflare retention separately; the app does not configure those external providers automatically.

## Incident procedure

1. Record discovery time, reporter and known facts in a restricted incident record. Isolate the affected component; disable tunnel access if necessary. Preserve evidence securely without unnecessarily copying personal data. Rotate compromised credentials and invalidate affected sessions.
2. Establish affected data, users, exposure period, impact, containment and likelihood/severity of risk. Involve the operator and legal adviser immediately. Document uncertainty and decisions.
3. Under GDPR Art. 33, notify the competent supervisory authority without undue delay and, where feasible, within 72 hours of awareness, unless the breach is unlikely to result in a risk to rights and freedoms. Explain delay and provide information in phases if needed. Document all personal-data breaches, including decisions not to notify.
4. Under Art. 34, communicate without undue delay to affected people when likely high risk, subject to the actual statutory exceptions. Use clear facts and practical protective actions; do not rely on a beta disclaimer.
5. Fix the cause, validate recovery/deletion reconciliation, review controls and preserve a dated post-incident record. Exercise this process before launch.

References for legal review: GDPR Regulation (EU) 2016/679 on EUR-Lex; current German DDG and TDDDG on gesetze-im-internet.de. Check current applicability with counsel, especially consumer/health-data and operator obligations.
