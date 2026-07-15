"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, LockKeyhole, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/types";
import { LanguageToggle } from "./language-toggle";

// design-briefs.md §1.5 — durations/easing mirror the theme's --duration
// tokens (250ms / 150ms); framer-motion needs numeric seconds so these are
// re-expressed here rather than the CSS var (same convention as logo.tsx).
const EASE = [0.4, 0, 0.2, 1] as const;
const CARD_ENTER_DELAY_S = 0.06; // 60ms after the backdrop starts fading in
const CARD_ENTER_DURATION_S = 0.25;
const CARD_EXIT_DURATION_S = 0.15;
// logo bar-rise starts 100ms after the card "lands" (60ms delay + 250ms rise).
const LOGO_START_DELAY_MS = 410;

type FieldErrors = { username: boolean; password: boolean };
const NO_ERRORS: FieldErrors = { username: false, password: false };

export function LoginScreen() {
  const t = useTranslations("login");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>(NO_ERRORS);
  const [playLogo, setPlayLogo] = React.useState(reduceMotion);
  const showError = fieldErrors.username || fieldErrors.password;

  React.useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => setPlayLogo(true), LOGO_START_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);

  function clearErrors() {
    setFieldErrors((prev) =>
      prev.username || prev.password ? NO_ERRORS : prev,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const usernameEmpty = !username.trim();
    const passwordEmpty = !password.trim();
    if (usernameEmpty || passwordEmpty) {
      setFieldErrors({ username: usernameEmpty, password: passwordEmpty });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setFieldErrors({ username: true, password: true });
        setLoading(false);
        return;
      }
      setSuccess(true);
      window.setTimeout(
        () => router.push("/"),
        reduceMotion ? 0 : CARD_EXIT_DURATION_S * 1000,
      );
    } catch {
      setFieldErrors({ username: true, password: true });
      setLoading(false);
    }
  }

  return (
    <main className="bg-navy relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      {/* backdrop — the design team's finished dark splash cover
         (public/backgrounds/growth-dark.png): deep-navy field with the emerald
         growth-swoosh and glass bars climbing off the bottom-right, the raster
         twin of the app's light hero art. `object-cover` fills the viewport at
         any aspect; pinned `dir="ltr"` so the composition never mirrors in
         Arabic. The whole splash is the one genuinely dark surface in an
         otherwise light-mode app, so the dark asset earns its place here. */}
      <motion.div
        aria-hidden="true"
        dir="ltr"
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: reduceMotion ? 0 : CARD_ENTER_DURATION_S,
          ease: EASE,
        }}
      >
        <Image
          src="/backgrounds/growth-dark.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      <div
        className="relative z-10 w-[400px] max-w-full"
        style={{ marginTop: "-4vh" }}
      >
        <motion.div
          className="rounded-card bg-card shadow-modal p-8"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: success ? 0 : 1, y: 0 }}
          transition={
            success
              ? {
                  duration: reduceMotion ? 0 : CARD_EXIT_DURATION_S,
                  ease: EASE,
                }
              : {
                  duration: reduceMotion ? 0 : CARD_ENTER_DURATION_S,
                  ease: EASE,
                  delay: reduceMotion ? 0 : CARD_ENTER_DELAY_S,
                }
          }
        >
          <div className="flex h-9 items-center justify-center">
            {playLogo && (
              <Logo
                variant={
                  locale === "ar" ? "horizontal-bilingual" : "horizontal"
                }
                size={30}
                animated={!reduceMotion}
              />
            )}
          </div>

          {/* addendum brand lockup — tagline + caption under the logo (blended
             into the otherwise-unchanged §1 card spec; see task summary). */}
          <p className="text-accent mt-2 text-center text-[0.8125rem] font-bold">
            {t("tagline")}
          </p>
          <p className="text-text-secondary mt-1 text-center text-xs font-medium">
            {t("caption")}
          </p>

          <h1 className="text-h2 text-navy mt-5 text-center font-extrabold">
            {t("title")}
          </h1>
          <p className="text-text-secondary mt-1 text-center text-sm">
            {t("subtitle")}
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7">
            <Input
              startIcon={<User className="size-4" aria-hidden="true" />}
              placeholder={t("usernamePlaceholder")}
              aria-label={t("username")}
              autoComplete="username"
              invalid={fieldErrors.username}
              disabled={loading}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearErrors();
              }}
            />

            <div className="mt-4">
              <Input
                type="password"
                startIcon={
                  <LockKeyhole className="size-4" aria-hidden="true" />
                }
                placeholder={t("password")}
                aria-label={t("password")}
                autoComplete="current-password"
                invalid={fieldErrors.password}
                disabled={loading}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearErrors();
                }}
              />
            </div>

            <div className="mt-2 h-5">
              <AnimatePresence>
                {showError && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.15,
                      ease: EASE,
                    }}
                    className="text-danger flex items-center gap-1.5 text-[0.8125rem] font-medium"
                  >
                    <CircleAlert
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("error")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              className="mt-4 w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? t("loading") : t("cta")}
            </Button>
          </form>

          <div className="border-border mt-5 border-t pt-3">
            <p className="text-text-secondary text-center text-xs font-medium">
              {t("footer")}
            </p>
          </div>
        </motion.div>
      </div>

      <LanguageToggle />
    </main>
  );
}
