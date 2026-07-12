import type { Metadata } from "next";
import { LoginScreen } from "./login-screen";

/**
 * /login — full-viewport route, no app shell (design-briefs.md §1.2). The
 * first live pixels the judges see: gradient backdrop, animated logo-bar
 * entrance, mock sign-in card. See login-screen.tsx for the interactive
 * client component and language-toggle.tsx for the locale switcher.
 */
export const metadata: Metadata = {
  title: "Sign in — Faheem",
};

export default function LoginPage() {
  return <LoginScreen />;
}
