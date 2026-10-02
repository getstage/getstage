import { expect, test } from "vitest";
import { resolvePostAuthRedirect } from "../../../apps/web-application/src/lib/postAuthRedirect";
import { getWebRouteLockRedirect } from "../../../apps/web-application/src/lib/webRoutePolicy";

test("marketplace login returns to the intended profile resource",()=>{
  expect(resolvePostAuthRedirect({redirect:"/profile?save=skills%2Ftaste"})).toBe("/profile?save=skills%2Ftaste");
  expect(resolvePostAuthRedirect({redirect:"https://example.com/profile"})).toBe("/download/mac");
  expect(resolvePostAuthRedirect({redirect:"//example.com/profile"})).toBe("/download/mac");
  expect(resolvePostAuthRedirect({redirect:"/profile-evil"})).toBe("/download/mac");
});
test("marketplace and profile routes are reachable while product workspace locks stay intact",()=>{
  for(const path of ["/marketplace","/marketplace/","/component-libraries/","/skills/taste/","/tools/","/profile","/builders/example","/blog/"]){expect(getWebRouteLockRedirect(path)).toBeNull();}
  expect(getWebRouteLockRedirect("/settings")).toBe("/download/mac");
  expect(getWebRouteLockRedirect("/dashboard")).toBe("/download/mac");
});
