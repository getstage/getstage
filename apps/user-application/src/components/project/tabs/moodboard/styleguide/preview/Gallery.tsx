import { Bell, CalendarBlank, Copy, DotsThree, Gear, MagnifyingGlass, Plus, SignOut, User } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Alert, AlertDescription, AlertTitle, Avatar, AvatarFallback, Progress } from "@/components/shadcn/feedback";
import { RadioGroup, RadioGroupItem, SelectTrigger, Slider, Textarea, ToggleGroup, ToggleGroupItem } from "@/components/shadcn/form";
import { Input, Label } from "@/components/shadcn/input";
import { Breadcrumb, Kbd, MenuItem, MenuPanel, Pagination, Separator, Skeleton } from "@/components/shadcn/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Checkbox, Switch } from "@/components/shadcn/toggles";

function Tile({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 rounded-sg border border-sg-border bg-sg-muted/40 p-[calc(20px*var(--sg-space))] ${className}`}>
      <span className="text-[11px] font-medium tracking-wide text-sg-muted-foreground uppercase">{title}</span>
      <div className="flex flex-1 flex-col justify-center gap-3">{children}</div>
    </div>
  );
}

// Every shadcn/ui component the export themes, rendered with this Direction.
export function Gallery() {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-xs font-medium tracking-wide text-sg-muted-foreground uppercase">Components</h3>
      <div className="grid grid-cols-2 gap-[calc(16px*var(--sg-space))] @4xl:grid-cols-3">
        <Tile title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive" size="sm">Delete</Button>
            <Button variant="outline" size="icon" aria-label="Add"><Plus size={16} /></Button>
            <Button disabled size="sm">Disabled</Button>
          </div>
        </Tile>
        <Tile title="Sign in form">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-email">Email</Label>
            <Input id="sg-email" placeholder="you@studio.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-password">Password</Label>
            <Input id="sg-password" type="password" defaultValue="secret-pass" />
          </div>
          <Label><Checkbox defaultChecked /> Remember me</Label>
          <Button>Continue</Button>
        </Tile>
        <Tile title="Badges & avatars">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <div className="flex -space-x-2">
            {["AK", "JM", "SR", "+4"].map((initials) => (
              <Avatar key={initials} className="border-2 border-sg-background"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            ))}
          </div>
          <Breadcrumb items={["Projects", "Stage", "Style guide"]} />
        </Tile>

        <Tile title="Card">
          <Card className="gap-3 py-4">
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
        <Tile title="Settings">
          <div className="flex items-center justify-between text-sm">Notifications <Switch defaultChecked aria-label="Notifications" /></div>
          <div className="flex items-center justify-between text-sm">Weekly digest <Switch aria-label="Weekly digest" /></div>
          <Separator />
          <RadioGroup defaultValue="team">
            <Label><RadioGroupItem value="me" /> Only me</Label>
            <Label><RadioGroupItem value="team" /> Whole team</Label>
          </RadioGroup>
          <Slider defaultValue={[60]} max={100} />
        </Tile>
        <Tile title="Menu">
          <MenuPanel label="My account">
            <MenuItem shortcut="⇧P"><User size={14} /> Profile</MenuItem>
            <MenuItem shortcut="⌘,"><Gear size={14} /> Settings</MenuItem>
            <MenuItem><Copy size={14} /> Duplicate</MenuItem>
            <Separator className="-mx-1 my-1 w-auto" />
            <MenuItem destructive><SignOut size={14} /> Log out</MenuItem>
          </MenuPanel>
        </Tile>

        <Tile title="Alerts">
          <Alert>
            <AlertTitle>Launch is on track</AlertTitle>
            <AlertDescription>3 of 4 milestones are done.</AlertDescription>
          </Alert>
          <Alert destructive>
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>Update your card to keep access.</AlertDescription>
          </Alert>
        </Tile>
        <Tile title="Message">
          <div className="flex flex-col gap-1.5">
            <Label>Topic</Label>
            <SelectTrigger><span>Design review</span></SelectTrigger>
          </div>
          <Textarea placeholder="Write a short note for the client…" />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-sg-muted-foreground">Send with <Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
            <Button size="sm">Send</Button>
          </div>
        </Tile>
        <Tile title="Tabs & toggles">
          <Tabs defaultValue="week">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
            <TabsContent value="week" className="pt-2 text-sm text-sg-muted-foreground">12 tasks due this week.</TabsContent>
            <TabsContent value="day" className="pt-2 text-sm text-sg-muted-foreground">3 tasks due today.</TabsContent>
            <TabsContent value="month" className="pt-2 text-sm text-sg-muted-foreground">41 tasks this month.</TabsContent>
          </Tabs>
          <ToggleGroup type="single" defaultValue="grid">
            <ToggleGroupItem value="list">List</ToggleGroupItem>
            <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
            <ToggleGroupItem value="board">Board</ToggleGroupItem>
          </ToggleGroup>
        </Tile>

        <Tile title="Loading & progress">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Progress value={68} />
          <span className="text-xs text-sg-muted-foreground">Uploading assets · 68%</span>
        </Tile>
        <Tile title="Toast">
          <div className="flex items-start gap-3 rounded-sg border border-sg-border bg-sg-background p-3 shadow-lg">
            <Bell size={16} className="mt-0.5 text-sg-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Style guide published</p>
              <p className="text-sg-muted-foreground">Your team can now use it.</p>
            </div>
            <Button size="sm" variant="outline">Undo</Button>
          </div>
          <div className="flex items-center gap-2 rounded-sg border border-sg-border bg-sg-background px-3 text-sm text-sg-muted-foreground">
            <MagnifyingGlass size={14} />
            <span className="flex-1 py-2">Search projects…</span>
            <Kbd>⌘K</Kbd>
          </div>
        </Tile>
        <Tile title="Pagination & date">
          <Pagination pages={3} current={2} />
          <Button variant="outline" className="justify-start text-sg-muted-foreground">
            <CalendarBlank size={16} /> Pick a date
          </Button>
          <Button variant="ghost" size="icon" aria-label="More"><DotsThree size={18} /></Button>
        </Tile>
      </div>
    </section>
  );
}
