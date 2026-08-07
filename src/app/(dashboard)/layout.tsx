import Link from "next/link";
import { Inbox, Radar, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Radar className="size-5 text-primary" />
          <span className="text-sm font-semibold">Thread</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <span className="text-sm font-medium text-muted-foreground">Demo project</span>
          <Badge variant="outline" className="gap-1.5 text-xs font-normal">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Ingestion lag: 4m (mock data)
          </Badge>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
