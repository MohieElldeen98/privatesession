import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function AppHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-4 py-3 backdrop-blur">
      {backHref && (
        <Link
          href={backHref}
          className="-mr-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          aria-label="رجوع"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {action}
    </header>
  );
}
