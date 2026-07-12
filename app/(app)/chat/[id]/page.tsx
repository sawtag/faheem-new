import { Suspense } from "react";
import { ChatView } from "@/components/chat/chat-view";

/**
 * Flagship chat route. ChatView resolves seeded + runtime chats client-side and
 * runs the SSE stream; Suspense satisfies useSearchParams for the `/chat/new`
 * hand-off.
 */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ChatView id={id} />
    </Suspense>
  );
}
