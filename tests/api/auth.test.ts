import { describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/auth/route";

function authRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth", () => {
  it("sets the httpOnly session cookie for non-empty credentials", async () => {
    const res = await POST(authRequest({ username: "ali", password: "demo" }));
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("faheem_session=1");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
  });

  it("rejects empty credentials with 400 and no cookie", async () => {
    const res = await POST(authRequest({ username: "", password: "" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects whitespace-only credentials with 400", async () => {
    const res = await POST(authRequest({ username: "   ", password: "demo" }));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed JSON body with 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/auth", () => {
  it("expires the session cookie", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("faheem_session=;");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
  });
});
