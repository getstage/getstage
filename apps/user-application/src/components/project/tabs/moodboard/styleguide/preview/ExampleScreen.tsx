import { ChartBar, Folder, House, MagnifyingGlass, Plus, Users } from "@phosphor-icons/react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Avatar, AvatarFallback, Table, TableCell, TableHead, TableRow } from "@/components/shadcn/feedback";
import { Input } from "@/components/shadcn/input";

const NAV = [
  { icon: House, label: "Overview", active: true },
  { icon: Folder, label: "Projects" },
  { icon: Users, label: "Clients" },
  { icon: ChartBar, label: "Reports" },
];
const STATS = [
  { label: "Revenue", value: "€48,290", change: "+12.4%" },
  { label: "Active projects", value: "18", change: "+3" },
  { label: "Hours logged", value: "1,204", change: "−2.1%" },
];
const BARS = [42, 58, 35, 72, 64, 88, 54, 76, 69, 92, 81, 60];
const ROWS = [
  { initials: "AK", name: "Anna K.", project: "Brand refresh", status: "Live", hours: "32.5" },
  { initials: "JM", name: "Jonas M.", project: "Checkout flow", status: "Review", hours: "18.0" },
  { initials: "SR", name: "Sara R.", project: "Mobile app", status: "Draft", hours: "7.25" },
];

// A full app screen built only from the themed components: what the Direction feels like in use.
export function ExampleScreen() {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xs font-medium tracking-wide text-sg-muted-foreground uppercase">Example screen</h3>
      <div className="flex overflow-hidden rounded-sg border-[length:var(--sg-border-width)] border-sg-border bg-sg-background [box-shadow:var(--sg-shadow)]">
        <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-sg-border bg-sg-muted/60 p-3">
          <span className="mb-3 px-2 font-[family-name:var(--sg-font-heading)] text-sm font-semibold">Studio</span>
          {NAV.map(({ icon: Icon, label, active }) => (
            <span key={label} className={`flex items-center gap-2 rounded-sg px-2 py-1.5 text-sm ${active ? "bg-sg-background font-medium shadow-xs" : "text-sg-muted-foreground"}`}>
              <Icon size={15} /> {label}
            </span>
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-[calc(20px*var(--sg-space))] p-[calc(20px*var(--sg-space))]">
          <header className="flex items-center gap-3">
            <h4 className="flex-1 font-[family-name:var(--sg-font-heading)] text-xl font-semibold">Overview</h4>
            <div className="relative w-48">
              <MagnifyingGlass size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sg-muted-foreground" />
              <Input placeholder="Search" className="pl-8" />
            </div>
            <Button size="sm"><Plus size={14} /> New project</Button>
          </header>
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((stat) => (
              <Card key={stat.label} className="gap-1 py-4">
                <CardHeader className="px-4">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 text-xs text-sg-muted-foreground">{stat.change} vs last month</CardContent>
              </Card>
            ))}
          </div>
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle>Billable hours</CardTitle>
              <CardDescription>Last 12 weeks</CardDescription>
            </CardHeader>
            <CardContent className="flex h-28 items-end gap-2 px-4">
              {BARS.map((height, index) => (
                <span key={index} className="flex-1 rounded-t-[calc(var(--radius)/2)] bg-sg-primary" style={{ height: `${height}%`, opacity: index === BARS.length - 3 ? 1 : 0.55 }} />
              ))}
            </CardContent>
          </Card>
          <Table>
            <thead>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="size-6"><AvatarFallback>{row.initials}</AvatarFallback></Avatar>
                    {row.name}
                  </TableCell>
                  <TableCell>{row.project}</TableCell>
                  <TableCell><Badge variant={row.status === "Live" ? "default" : row.status === "Review" ? "secondary" : "outline"}>{row.status}</Badge></TableCell>
                  <TableCell className="text-right font-[family-name:var(--sg-font-mono)]">{row.hours}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </section>
  );
}
