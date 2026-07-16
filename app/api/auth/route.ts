/**
 * POST /api/auth, mock sign-in (AGENTS.md rule 10: any NON-EMPTY username +
 * password succeeds; there is no real credential check). Sets the
 * `faheem_session` cookie the middleware gate looks for; empty/whitespace-only
 * fields get a 400 so the login screen can render its inline error.
 * DELETE /api/auth is sign-out: expires the cookie so the proxy gate sends
 * the next navigation back to /login.
 */
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "faheem_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 1 week, demo session

const AuthRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = AuthRequestSchema.safeParse(body);
  const username = parsed.success ? parsed.data.username.trim() : "";
  const password = parsed.success ? parsed.data.password.trim() : "";

  if (!username || !password) {
    return Response.json(
      { error: "Enter your username and password" },
      { status: 400 },
    );
  }

  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_S}`,
  );
  return response;
}

export async function DELETE(): Promise<Response> {
  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}
