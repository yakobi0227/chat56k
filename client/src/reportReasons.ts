export const REPORT_REASONS = [
  "Scam / fraud",
  "Harassment",
  "Sexual misconduct",
  "Impersonation",
  "Spam",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
