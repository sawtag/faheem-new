import { describe, expect, it } from "vitest";
import {
  isSmbPath,
  isValidFilesTarget,
  isValidHttpsUrl,
} from "@/components/connections/add-source-modal";

describe("isValidHttpsUrl", () => {
  it("accepts a well-formed https URL", () => {
    expect(isValidHttpsUrl("https://mcp.internal.lunar.sa")).toBe(true);
    expect(isValidHttpsUrl("https://mcp.internal.lunar.sa/path?x=1")).toBe(
      true,
    );
  });

  it("rejects http (non-https) URLs", () => {
    expect(isValidHttpsUrl("http://mcp.internal.lunar.sa")).toBe(false);
  });

  it("rejects malformed or empty input", () => {
    expect(isValidHttpsUrl("")).toBe(false);
    expect(isValidHttpsUrl("not a url")).toBe(false);
    expect(isValidHttpsUrl("mcp.internal.lunar.sa")).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidHttpsUrl("  https://mcp.internal.lunar.sa  ")).toBe(true);
  });
});

describe("isSmbPath", () => {
  it("accepts smb:// URLs (case-insensitive) and UNC paths", () => {
    expect(isSmbPath("smb://fileserver.lunar.sa/deals")).toBe(true);
    expect(isSmbPath("SMB://FILESERVER/deals")).toBe(true);
    expect(isSmbPath("\\\\fileserver\\deals")).toBe(true);
  });

  it("rejects non-SMB and bare-scheme values", () => {
    expect(isSmbPath("https://files.lunar.sa")).toBe(false);
    expect(isSmbPath("smb://")).toBe(false);
    expect(isSmbPath("")).toBe(false);
  });
});

describe("isValidFilesTarget", () => {
  it("accepts HTTPS URLs and SMB paths, rejects everything else", () => {
    expect(isValidFilesTarget("https://files.lunar.sa/deals")).toBe(true);
    expect(isValidFilesTarget("smb://fileserver.lunar.sa/deals")).toBe(true);
    expect(isValidFilesTarget("\\\\fileserver\\deals")).toBe(true);
    expect(isValidFilesTarget("ftp://fileserver/deals")).toBe(false);
    expect(isValidFilesTarget("not a path")).toBe(false);
  });
});
