import { toSearchText, toSlug } from "./index";

/**
 * Unit, because neither function takes a `Db | Tx` (ADR-0017). They are the whole of ADR-0014's
 * "normalise in application code" — everything the database does with the result is a plain `LIKE`
 * over the column they produced.
 */

describe("toSearchText", () => {
  it("lowercases", () => {
    expect(toSearchText("MESERO")).toBe("mesero");
  });

  it("strips the accents Colombians do not type", () => {
    expect(toSearchText("Atención al cliente")).toBe("atencion al cliente");
    expect(toSearchText("Cuidado de niños")).toBe("cuidado de ninos");
    expect(toSearchText("Conducción de motocicleta")).toBe("conduccion de motocicleta");
  });

  it("collapses whitespace and trims", () => {
    expect(toSearchText("  cuidado   de  niños \n")).toBe("cuidado de ninos");
  });

  it("turns punctuation into a space, so nothing in it can be a LIKE wildcard", () => {
    // The same normaliser runs over the seeded term and over what the person typed, which is what
    // makes `%` and `_` unreachable from a query rather than escaped in one.
    expect(toSearchText("aseo/limpieza")).toBe("aseo limpieza");
    expect(toSearchText("100% manual_")).toBe("100 manual");
  });

  it("keeps digits", () => {
    expect(toSearchText("Conducción categoría B1")).toBe("conduccion categoria b1");
  });

  it("is idempotent", () => {
    const once = toSearchText("Atención al cliente");
    expect(toSearchText(once)).toBe(once);
  });

  it("has nothing to say about an empty string", () => {
    expect(toSearchText("   ")).toBe("");
  });
});

describe("toSlug", () => {
  it("is Spanish, unaccented and kebab-case (ADR-0012)", () => {
    expect(toSlug("Atención al cliente")).toBe("atencion-al-cliente");
    expect(toSlug("Santa Rosa de Cabal")).toBe("santa-rosa-de-cabal");
    expect(toSlug("Niñera")).toBe("ninera");
  });

  it("is idempotent, so a slug can be re-slugged without changing identity", () => {
    const once = toSlug("Cuidado de niños");
    expect(toSlug(once)).toBe(once);
  });

  it("does not leave a leading, trailing or doubled separator", () => {
    expect(toSlug("  ¡Ventas y atención!  ")).toBe("ventas-y-atencion");
    expect(toSlug("aseo / limpieza")).toBe("aseo-limpieza");
  });
});
