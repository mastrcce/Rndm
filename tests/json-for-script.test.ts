import { describe, expect, it } from "vitest";
import { jsonForScript } from "@/lib/utils";

describe("jsonForScript", () => {
  it("verhindert das Beenden des Script-Elements", () => {
    const out = jsonForScript({ name: "Hof</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "Hof</script><script>alert(1)</script>" });
  });
});
