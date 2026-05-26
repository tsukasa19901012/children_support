export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type ContactCategory =
  | "billing"
  | "account"
  | "privacy"
  | "bug"
  | "other";
