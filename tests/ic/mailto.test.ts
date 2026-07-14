import { describe, expect, it } from "vitest";
import {
  MAILTO_MAX_LENGTH,
  buildMailtoHref,
  normalizeCrlf,
} from "@/lib/ic/mailto";

describe("normalizeCrlf", () => {
  it("converts bare \\n and \\r to CRLF, leaves existing CRLF alone", () => {
    expect(normalizeCrlf("a\nb")).toBe("a\r\nb");
    expect(normalizeCrlf("a\r\nb")).toBe("a\r\nb");
    expect(normalizeCrlf("a\rb")).toBe("a\r\nb");
    expect(normalizeCrlf("a\r\n\nb")).toBe("a\r\n\r\nb");
  });
});

describe("buildMailtoHref", () => {
  it("builds a well-formed mailto: href with encoded subject + body", () => {
    const { href, truncated } = buildMailtoHref({
      to: ["ali@lunar-inv.sa"],
      subject: "Jahez — IC materials",
      body: "Dear IC,\n\nSee attached.",
    });
    expect(truncated).toBe(false);
    expect(href.startsWith("mailto:ali%40lunar-inv.sa?")).toBe(true);
    expect(href).toContain(
      `subject=${encodeURIComponent("Jahez — IC materials")}`,
    );
    // body is CRLF-normalized before encoding — %0D%0A per line break
    expect(href).toContain("body=Dear%20IC%2C%0D%0A%0D%0ASee%20attached.");
  });

  it("joins multiple recipients with a comma, each individually percent-encoded", () => {
    const { href } = buildMailtoHref({
      to: ["Lunar IC Group <ic@lunar-inv.sa>", "ali@lunar-inv.sa"],
      subject: "s",
      body: "b",
    });
    const recipients = href.slice("mailto:".length, href.indexOf("?"));
    expect(recipients).toBe(
      `${encodeURIComponent("Lunar IC Group <ic@lunar-inv.sa>")},${encodeURIComponent("ali@lunar-inv.sa")}`,
    );
    // the joining comma itself must stay a literal delimiter, not %2C
    expect(recipients.split(",")).toHaveLength(2);
  });

  it("normalizes bare \\n to CRLF before encoding the body", () => {
    const { href } = buildMailtoHref({
      to: ["a@b.com"],
      subject: "s",
      body: "line1\nline2",
    });
    expect(href).toContain("body=line1%0D%0Aline2");
  });

  it("passes an ordinary draft through untouched (no truncation)", () => {
    const { href, truncated } = buildMailtoHref({
      to: ["a@b.com"],
      subject: "short subject",
      body: "a short body",
    });
    expect(truncated).toBe(false);
    expect(href.length).toBeLessThan(200);
  });

  it("trims an oversized body to fit MAILTO_MAX_LENGTH, leaving recipients + subject intact", () => {
    const to = ["Lunar IC Group <ic@lunar-inv.sa>"];
    const subject = "Jahez — IC materials & recommendation";
    const body = "x".repeat(5000);

    const { href, truncated } = buildMailtoHref({ to, subject, body });

    expect(truncated).toBe(true);
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    expect(href).toContain(`subject=${encodeURIComponent(subject)}`);
    expect(href.startsWith(`mailto:${encodeURIComponent(to[0]!)}?`)).toBe(true);
    // truncation marker survives encoding (…  → %E2%80%A6)
    expect(href).toContain(encodeURIComponent("…"));
  });

  it("truncation is stable and always produces a well-formed href even for pathological huge bodies", () => {
    const { href, truncated } = buildMailtoHref({
      to: ["a@b.com"],
      subject: "s",
      body: "y".repeat(1_000_000),
    });
    expect(truncated).toBe(true);
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    expect(href.startsWith("mailto:a%40b.com?subject=s&body=")).toBe(true);
  });
});
