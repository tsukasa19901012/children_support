import { describe, expect, it } from "vitest";
import { sortMessagesByChatOrder } from "./sortMessages";

describe("sortMessagesByChatOrder", () => {
  it("sorts by created_at ascending", () => {
    const rows = [
      { id: "2", role: "assistant", content: "b", created_at: "2026-01-02T00:00:00Z" },
      { id: "1", role: "user", content: "a", created_at: "2026-01-01T00:00:00Z" },
    ];
    const sorted = sortMessagesByChatOrder(rows);
    expect(sorted.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("puts user before assistant when created_at is equal", () => {
    const ts = "2026-01-01T12:00:00.000Z";
    const rows = [
      { id: "a", role: "assistant", content: "answer", created_at: ts },
      { id: "u", role: "user", content: "question", created_at: ts },
    ];
    const sorted = sortMessagesByChatOrder(rows);
    expect(sorted.map((r) => r.role)).toEqual(["user", "assistant"]);
  });
});
