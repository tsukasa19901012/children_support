import type { LegalSection } from "../types";

type Props = {
  sections: LegalSection[];
};

export function LegalDocument({ sections }: Props) {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="font-bold text-gray-800 mb-2">{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="mb-2 last:mb-0">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
