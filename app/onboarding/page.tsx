import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/connections/onboarding/onboarding-flow";

/**
 * /onboarding, full-viewport day-one takeover, no app shell (design-briefs
 * §2.4). Sits OUTSIDE the `(app)` group so there is no sidebar; auth still
 * applies via proxy.ts. See onboarding-flow.tsx for the interactive flow.
 */
export const metadata: Metadata = {
  title: "Set up your workspace, Faheem",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
