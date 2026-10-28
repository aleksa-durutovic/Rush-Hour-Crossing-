# Manual Gemini account verification

Official documentation checked2026-10-28. **Every owner/account item below is PENDING /
UNVERIFIED.** This is a checklist for private inspection of the existing account, not
authorization to change settings, inspect/export credentials or make a request.

Do not paste key strings, private project/account IDs, billing screenshots or balances
into repository evidence. A sanitized confirmation may identify item ID/date/status and
the owner's selected policy without secrets. No new account, provider or service.

## Checklist and enforcement distinctions

- [ ] **M1 - Existing project/key scope.** Privately identify the credential's existing
  project, key type/status and responsible maintainer. Check restriction to Generative
  Language API (`generativelanguage.googleapis.com`). Current docs distinguish standard
  keys from service-account-bound authorization keys; AI Studio's new keys default to
  authorization keys. API restriction controls service access, not spending.
  [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)

- [ ] **M2 - Application restriction feasibility.** Inspect which restrictions the actual
  key supports. For server requests, assess stable public outbound IP allowlisting.
  Google evaluates external caller IPs; localhost/internal addresses are unsupported.
  HTTP-referrer restriction describes browser callers. A changing home egress IP may make
  an IP rule impractical; record the limitation without adding infrastructure or exposing
  the key in the browser. [Google key management](https://docs.cloud.google.com/docs/authentication/api-keys)

- [ ] **M3 - Rejecting versus advisory restriction.** Confirm the configured API/client
  rules and their intended scope privately. A request violating an enforced restriction
  fails; this is not an alert. Do not test it with a real credential here.
  [Restriction behavior](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)

- [ ] **M4 - Actual quotas for existing primary and backup.** Inspect AI Studio's active
  limits for both configured models: applicable RPM, input TPM, RPD/TPD and spend-based
  rate limits. Quotas are project-scoped across keys, depend on model/tier, and excess
  requests fail. RPD resets midnight Pacific; rolling limits replenish. Verify what this
  account permits lowering; do not assume every quota is editable or another model/key
  supplies independent allowance. [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

- [ ] **M5 - Billing plan and AI Studio controls.** Inspect Free/Prepay/Postpay/invoiced
  status, linked consumers and effective project/account caps. Keys have no independent
  billing settings. AI Studio project caps are experimental with roughly10-minute
  enforcement latency/overage risk; invoiced accounts are excluded. Account caps pause
  linked projects when reached. Depleted Prepay credits stop usage, but processing delay
  can cause negative balances. Auto-reload replenishes credits; its monthly auto-charge
  limit excludes manual purchases and is not total-spend enforcement. Record existing
  eligibility/thresholds privately for owner review; do not create, migrate or alter them.
  [Gemini billing](https://ai.google.dev/gemini-api/docs/billing)

- [ ] **M6 - Alerts-only budgets.** Inspect scope, actual/forecast thresholds, recipients
  and who responds. Alerts notify; an alerts-only budget does not automatically stop
  requests/spending. No Pub/Sub or other automation service is proposed.
  [Billing budgets and alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)

- [ ] **M7 - Distinct Cloud Billing spend-cap budget.** Check actual availability/status
  for Gemini API. Current docs list it as eligible. These budgets pause new usage for
  one project/one eligible service, on a monthly period; in-flight requests can finish.
  Enforcement is delayed and overages billed. A monthly reset restores usage; manually
  lifting the cap removes enforcement for the rest of the period unless the cap is
  increased. Verify actual eligibility, scope, permissions and threshold privately.
  This differs from alerts-only budgets and from the AI Studio controls in M5.
  [Cloud Billing spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)

## What the repository cannot verify

Actual credential ownership/type/restrictions or authorized maintainers; public egress
stability; project IAM; billing linkage, plan, tier or balance; effective model quotas;
editable quota options; enabled spend caps/thresholds/status; auto-reload; alert delivery;
other applications/keys consuming the same account; historical/actual charges.

Repository fake tests verify local enforcement only. The owner-approved process attempt allowance
is neither a Google account cap nor an exact monetary cap. Owner must review appropriate
account controls separately; no particular account setting/value is asserted as present.

## Owner review record

M1-M7: pending. Owner/date/sanitized outcome not supplied. Keep unchecked until actual
private verification; documentation research is not successful account verification.
Recheck official pages before future account action because availability can change.
