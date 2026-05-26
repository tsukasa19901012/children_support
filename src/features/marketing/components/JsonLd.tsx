type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** 構造化データ（JSON-LD） */
export function JsonLd({ data }: Props) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
