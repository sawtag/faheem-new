import { loadScheduledTasks } from "./data";
import { ScheduledClient } from "./scheduled-client";

export default function ScheduledPage() {
  return <ScheduledClient tasks={loadScheduledTasks()} />;
}
