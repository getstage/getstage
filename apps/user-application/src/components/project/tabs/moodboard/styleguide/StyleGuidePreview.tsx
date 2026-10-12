import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Alert, AlertDescription, AlertTitle, Avatar, AvatarFallback, Progress, Table, TableCell, TableHead, TableRow } from "@/components/shadcn/feedback";
import { Input, Label } from "@/components/shadcn/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Checkbox, Switch } from "@/components/shadcn/toggles";
import { shadcnThemeVars, type ThemeMode } from "@/lib/project/styleGuideSpec";

const SAMPLE = "Build something people want.";
// The concept screen is laid out at a real desktop width, then scaled to fit the
// panel, so components keep their true proportions instead of squeezing.
const SCREEN_WIDTH = 920;

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / SCREEN_WIDTH)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

function Tile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-[180px] items-center justify-center rounded-sg bg-sg-muted p-[calc(20px*var(--sg-space))] ${className}`}>
      {children}
    </div>
  );
}

// A concept screen of the Direction built from real shadcn/ui components, themed by
// the guide's CSS variables so every edit recolours and reshapes it live.
export function StyleGuidePreview({ spec, mode }: { spec: StyleGuideSpec; mode: ThemeMode }) {
  const { ref, scale } = useFitScale();
  return (
    <div ref={ref}>
    <div
      style={{ ...shadcnThemeVars(spec, mode), width: SCREEN_WIDTH, zoom: scale }}
      className="flex flex-col gap-[calc(32px*var(--sg-space))] rounded-[10px] bg-sg-background p-[calc(28px*var(--sg-space))] font-[family-name:var(--sg-font-body)] text-[calc(14px*var(--sg-font-scale))] text-sg-foreground"
    >
      <section className="flex flex-col gap-5">
        <h3 className="text-sm font-medium text-sg-muted-foreground">Typography</h3>
        {spec.typescale.map((row, index) => (
          <div key={row.id}>
            <p
              className={index < spec.typescale.length - 1 ? "font-[family-name:var(--sg-font-heading)]" : undefined}
              style={{ fontSize: `calc(${row.size}px * var(--sg-font-scale))`, lineHeight: `${row.lineHeight}%`, fontWeight: row.weight, letterSpacing: `${row.tracking}em` }}
            >
              {SAMPLE}
            </p>
            <p className="mt-1 font-[family-name:var(--sg-font-mono)] text-xs text-sg-muted-foreground">
              {row.label} · {row.size}px · {row.lineHeight}% · {row.weight}
            </p>
          </div>
        ))}
        <p className="font-[family-name:var(--sg-font-mono)] text-sm">1,284.50 · const total = 42;</p>
      </section>

      <hr className="border-sg-border" />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-sg-muted-foreground">Components</h3>
        <div className="grid grid-cols-2 gap-3">
          <Tile>
            <div className="flex w-full max-w-[180px] flex-col gap-2.5">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </Tile>
          <Tile>
            <div className="flex w-full max-w-[220px] flex-col gap-2">
              <Label htmlFor="sg-email">Email</Label>
              <Input id="sg-email" placeholder="you@studio.com" />
              <p className="text-xs text-sg-muted-foreground">We'll never share it.</p>
              <Button className="mt-1">Continue</Button>
            </div>
          </Tile>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </Tile>
          <Tile>
            <Card className="w-full gap-3 py-4">
              <CardHeader className="px-4">
                <Badge variant="secondary">Featured</Badge>
                <CardTitle>Project kickoff</CardTitle>
                <CardDescription>A themed card built from this brand's palette.</CardDescription>
              </CardHeader>
              <CardFooter className="px-4">
                <Button size="sm">Open</Button>
                <Button size="sm" variant="outline">Cancel</Button>
              </CardFooter>
            </Card>
          </Tile>
          <Tile>
            <div className="flex w-full flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                Notifications <Switch defaultChecked aria-label="Notifications" />
              </div>
              <Label><Checkbox defaultChecked /> Auto-publish updates</Label>
              <Label className="text-sg-muted-foreground"><Checkbox /> Notify the client</Label>
            </div>
          </Tile>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile className="items-start">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="flex flex-col gap-3 pt-2">
                <Alert>
                  <AlertTitle>Launch is on track</AlertTitle>
                  <AlertDescription>3 of 4 milestones are done.</AlertDescription>
                </Alert>
                <Progress value={75} />
              </TabsContent>
              <TabsContent value="activity" className="pt-2 text-sm text-sg-muted-foreground">No new activity.</TabsContent>
            </Tabs>
          </Tile>
          <Tile className="items-start">
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {[["AK", "Anna K.", "32.5"], ["JM", "Jonas M.", "18.0"]].map(([initials, name, hours]) => (
                  <TableRow key={name}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="size-6"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                      {name}
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--sg-font-mono)]">{hours}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Tile>
        </div>
      </section>
    </div>
    </div>
  );
}
