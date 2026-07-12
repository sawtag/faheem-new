import { describe, expect, it } from "vitest";
import { isValidMcpUrl } from "@/components/connections/mcp-modal";

describe("isValidMcpUrl", () => {
  it("accepts a well-formed https URL", () => {
    expect(isValidMcpUrl("https://mcp.internal.lunar.sa")).toBe(true);
    expect(isValidMcpUrl("https://mcp.internal.lunar.sa/path?x=1")).toBe(true);
  });

  it("rejects http (non-https) URLs", () => {
    expect(isValidMcpUrl("http://mcp.internal.lunar.sa")).toBe(false);
  });

  it("rejects malformed or empty input", () => {
    expect(isValidMcpUrl("")).toBe(false);
    expect(isValidMcpUrl("not a url")).toBe(false);
    expect(isValidMcpUrl("mcp.internal.lunar.sa")).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidMcpUrl("  https://mcp.internal.lunar.sa  ")).toBe(true);
  });
});
