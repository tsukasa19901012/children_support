import { describe, expect, it } from "vitest";
import { RELATION_NONE } from "../types/siblingRelation";
import { peerLinksFromForm } from "./siblingRelations";

describe("peerLinksFromForm", () => {
  const childBirthday = "2022-03-01";
  const peers = {
    peer1: { birthday: "2020-01-01", gender: "male" as const },
    peer2: { birthday: "2023-01-01", gender: "female" as const },
  };

  it("excludes RELATION_NONE entries", () => {
    const links = peerLinksFromForm(
      { peer1: "sibling", peer2: RELATION_NONE },
      childBirthday,
      peers
    );
    expect(links).toHaveLength(1);
    expect(links[0].siblingId).toBe("peer1");
    expect(links[0].relation).toBe("older_brother");
  });

  it("resolves friend without age/gender dependency", () => {
    const links = peerLinksFromForm(
      { peer2: "friend" },
      childBirthday,
      peers
    );
    expect(links[0].relation).toBe("friend");
  });
});
