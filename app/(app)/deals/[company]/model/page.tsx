import { notFound } from "next/navigation";
import { dealById } from "@/lib/deals";
import { LiveModel } from "@/components/model/live-model";
import { ModelEmptyState } from "@/components/model/model-empty-state";

/**
 * Live Model (WS-B) for a company workspace. The model is ONE Jahez DCF, the
 * same pure `lib/model` engine that builds the Excel, recomputing in-browser.
 * Only Jahez carries model data; every other company gets a roadmap empty
 * state, consistent with the house pattern.
 */
const MODEL_COMPANY = "jahez";

export default async function ModelPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const deal = dealById(company);
  if (!deal) notFound();

  if (company !== MODEL_COMPANY) {
    return <ModelEmptyState companyId={company} companyName={deal.name} />;
  }

  return <LiveModel companyId={company} companyName={deal.name} />;
}
