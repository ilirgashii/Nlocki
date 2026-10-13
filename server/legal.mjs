export const PRIVACY_VERSION = "2026-10-13-beta-1";
export const EU_BALKAN_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "AL",
  "BA",
  "ME",
  "MK",
  "RS",
  "XK",
];
if (process.env.NODE_ENV === "production") {
  for (const key of [
    "OPERATOR_NAME",
    "PRIVACY_CONTACT",
    "OPERATOR_COUNTRY",
    "OPERATOR_ADDRESS",
  ])
    if (!process.env[key]?.trim())
      throw new Error(`${key} is required before serving real users.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.PRIVACY_CONTACT))
    throw new Error("PRIVACY_CONTACT must be a working email address.");
  if (process.env.PUBLIC_BETA_READY !== "true")
    throw new Error(
      "Complete the deployment/privacy review before enabling public beta.",
    );
}
