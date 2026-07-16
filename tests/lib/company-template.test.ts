import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CompanyTemplateMetaSchema,
  getCompanyTemplateBytes,
  getCompanyTemplateMeta,
  removeCompanyTemplate,
  saveCompanyTemplate,
} from "@/lib/company-template";

let dir: string;

function useTempStore(): void {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "faheem-company-template-"));
  process.env.FAHEEM_COMPANY_TEMPLATE_DIR = dir;
}

afterEach(() => {
  delete process.env.FAHEEM_COMPANY_TEMPLATE_DIR;
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
});

describe("lib/company-template", () => {
  it("no template uploaded -> meta null, bytes null", () => {
    useTempStore();
    expect(getCompanyTemplateMeta()).toBeNull();
    expect(getCompanyTemplateBytes()).toBeNull();
  });

  it("save + get roundtrip validates against CompanyTemplateMetaSchema", () => {
    useTempStore();
    const bytes = Buffer.from("PK\x03\x04 fake docx bytes");
    const meta = saveCompanyTemplate("IC-Template.docx", bytes, {
      found: ["perShare", "wacc"],
      unknown: ["companySpecificTag"],
    });

    expect(CompanyTemplateMetaSchema.safeParse(meta).success).toBe(true);
    expect(meta).toEqual({
      fileName: "IC-Template.docx",
      uploadedAt: expect.any(String),
      found: ["perShare", "wacc"],
      unknown: ["companySpecificTag"],
    });

    expect(getCompanyTemplateMeta()).toEqual(meta);
    expect(getCompanyTemplateBytes()).toEqual(bytes);
  });

  it("a second save replaces the single slot — never appends", () => {
    useTempStore();
    saveCompanyTemplate("first.docx", Buffer.from("PK one"), {
      found: [],
      unknown: [],
    });
    const second = saveCompanyTemplate("second.docx", Buffer.from("PK two"), {
      found: ["perShare"],
      unknown: [],
    });

    expect(getCompanyTemplateMeta()).toEqual(second);
    expect(getCompanyTemplateMeta()?.fileName).toBe("second.docx");
    expect(getCompanyTemplateBytes()?.toString()).toBe("PK two");
  });

  it("remove returns true when a template existed, false otherwise", () => {
    useTempStore();
    expect(removeCompanyTemplate()).toBe(false);

    saveCompanyTemplate("temp.docx", Buffer.from("PK bytes"), {
      found: [],
      unknown: [],
    });
    expect(removeCompanyTemplate()).toBe(true);
    expect(getCompanyTemplateMeta()).toBeNull();
    expect(getCompanyTemplateBytes()).toBeNull();
    expect(removeCompanyTemplate()).toBe(false);
  });

  it("a corrupt meta file behaves as null (safe fallback, same convention as lib/audit.ts)", () => {
    useTempStore();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "company-template.json"), "{ not json");
    expect(getCompanyTemplateMeta()).toBeNull();

    fs.writeFileSync(
      path.join(dir, "company-template.json"),
      JSON.stringify({ nope: true }),
    );
    expect(getCompanyTemplateMeta()).toBeNull();
  });

  it("CompanyTemplateMetaSchema accepts the committed initial `null`", () => {
    expect(CompanyTemplateMetaSchema.safeParse(null).success).toBe(true);
  });
});
