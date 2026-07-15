import { HomeHero } from "@/components/home/home-hero";
import dealsData from "@/data/deals.json";
import type { Deal } from "@/lib/types";

/**
 * Home / omnibox (T3.2), the serif-hero landing on camera at every demo beat.
 * Server component: hands the live (non-declined) deals, in curated demo order,
 * to the client hero. Everything interactive (composer, pills, rotation) is in
 * HomeHero.
 */
const RECENT_ORDER = ["jahez", "darb", "thara-pay"];

export default function HomePage() {
  const deals = (dealsData as Deal[])
    .filter((d) => d.stage !== "declined")
    .sort((a, b) => RECENT_ORDER.indexOf(a.id) - RECENT_ORDER.indexOf(b.id));

  return <HomeHero deals={deals} />;
}
