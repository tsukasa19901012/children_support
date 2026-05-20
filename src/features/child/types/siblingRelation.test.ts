import { describe, expect, it } from "vitest";
import {
  inverseRelation,
  resolvePeerRelation,
  storedRelationToKind,
} from "./siblingRelation";

describe("resolvePeerRelation", () => {
  it("resolves older brother from birthdays and male peer", () => {
    expect(
      resolvePeerRelation("sibling", "2022-01-01", "2020-01-01", "male")
    ).toBe("older_brother");
  });

  it("resolves younger sister from birthdays and female peer", () => {
    expect(
      resolvePeerRelation("sibling", "2020-01-01", "2022-01-01", "female")
    ).toBe("younger_sister");
  });

  it("treats same birthday sibling kind as twin", () => {
    expect(
      resolvePeerRelation("sibling", "2021-06-01", "2021-06-01", "male")
    ).toBe("twin");
  });

  it("resolves cousin age from birthdays", () => {
    expect(
      resolvePeerRelation("cousin", "2021-01-01", "2019-01-01", "female")
    ).toBe("cousin_older");
    expect(
      resolvePeerRelation("cousin", "2021-01-01", "2023-01-01", "female")
    ).toBe("cousin_younger");
  });
});

describe("storedRelationToKind", () => {
  it("maps stored relations back to form kinds", () => {
    expect(storedRelationToKind("older_sister")).toBe("sibling");
    expect(storedRelationToKind("friend")).toBe("friend");
    expect(storedRelationToKind("second_cousin_younger")).toBe("second_cousin");
  });
});

describe("inverseRelation", () => {
  it("inverts older brother when child is female", () => {
    expect(inverseRelation("older_brother", "female")).toBe("younger_sister");
  });

  it("keeps twin and friend", () => {
    expect(inverseRelation("twin", "male")).toBe("twin");
    expect(inverseRelation("friend", null)).toBe("friend");
  });
});
