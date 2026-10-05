import { describe, it, expect } from "vitest";
import { DIMENSIONS, groupsOf, keyFromLabel, LABEL_LISTS } from "./benchmarkGroups";
import { FIRM_SIZE, INDUSTRY, HQ, FUNCTIONS } from "./surveyUi";

const SOURCE = { branche: INDUSTRY, groesse: FIRM_SIZE, funktion: FUNCTIONS, sitz: HQ };

describe("Vergleichsgruppen", () => {
  it("hat je Merkmal genau zwei Gruppen", () => {
    DIMENSIONS.forEach((d) => expect(d.groups.length).toBe(2));
  });

  it("ordnet jede Kategorie genau einer Gruppe zu", () => {
    DIMENSIONS.forEach((d) => {
      const members = d.groups.flatMap((g) => g.members);
      const keys = SOURCE[d.key].map((x) => x.key);
      expect([...members].sort()).toEqual([...keys].sort());
      expect(new Set(members).size).toBe(members.length);
    });
  });

  it("bildet jede Bezeichnung in beiden Sprachen auf den Schluessel ab", () => {
    Object.values(LABEL_LISTS).forEach((list) =>
      list.forEach((x) => {
        expect(keyFromLabel(list, x.label.de)).toBe(x.key);
        expect(keyFromLabel(list, x.label.en)).toBe(x.key);
        expect(keyFromLabel(list, "  " + x.label.de.toUpperCase() + " ")).toBe(x.key);
      }),
    );
    expect(keyFromLabel(FIRM_SIZE, "1.000–4.999")).toBe("1k_5k");
    expect(keyFromLabel(FIRM_SIZE, "1.000-4.999")).toBe("1k_5k");
    expect(keyFromLabel(FUNCTIONS, "Eigene Lohnbuchhaltung")).toBeNull();
    expect(keyFromLabel(FUNCTIONS, "")).toBeNull();
  });

  it("findet die Gruppen einer Person", () => {
    expect(groupsOf({ size: "gte25k", industry: "finance", hq: "ch", fn: "erp" })).toEqual({
      branche: "reguliert", groesse: "ab1000", funktion: "anwendungen", sitz: "schweiz",
    });
    expect(groupsOf({ size: "", industry: "", hq: "", fn: "other" })).toEqual({});
  });
});
