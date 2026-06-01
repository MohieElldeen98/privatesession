import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS_LABELS, SessionStatus } from "@/lib/types";

const VARIANT: Record<SessionStatus, "default" | "muted" | "success" | "warning" | "destructive"> = {
  done: "success",
  pending: "muted",
  postponed: "warning",
  cancelled: "destructive",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={VARIANT[status]}>{SESSION_STATUS_LABELS[status]}</Badge>;
}
