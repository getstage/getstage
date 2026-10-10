import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'vite';
import { readFile } from 'node:fs/promises';

// Exercise the real Worker: private page rewrites must never capture images.
const result = await build({configFile:false, logLevel:'silent', resolve:{alias:{'@':path.resolve('src')}}, ssr:{noExternal:true}, build:{ssr:'worker/index.ts',write:false}});
const chunk = result.output.find(entry => entry.type === 'chunk');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
for (const [pathname, expected] of [
  ['/auth?mode=login','/app-shell'], ['/auth/desktop?state=test','/app-shell'],
  ['/download/mac','/app-shell'], ['/profile','/app-shell'],
  ['/setup-profile','/app-shell'], ['/builders/example','/app-shell'],
  ['/auth/signup-logo.svg','/auth/signup-logo.svg'],
  ['/auth/signup-brand.png','/auth/signup-brand.png'],
  ['/auth/auth-cta.webp','/auth/auth-cta.webp'],
  ['/','/'], ['/download','/download'], ['/component-libraries','/component-libraries'],
]) {
  let requested;
  const response = await worker.fetch(new Request(`https://getstage.co${pathname}`), {
    ASSETS: { fetch(request) { requested = new URL(request.url).pathname; return new Response('asset', {headers:{'Content-Type': /\.(svg|png|webp)$/.test(requested) ? 'image/png' : 'text/html'}}); } },
  });
  assert.equal(requested,expected,pathname);
  assert.equal(response.status,200,pathname);
  if(expected==='/app-shell') assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
}
// Telemetry is handled before the generic Convex proxy and stays disabled without its own configuration.
const telemetry = await worker.fetch(new Request('https://testing.getstage.co/api/telemetry', {method:'POST'}), {
  CONVEX_HTTP_ORIGIN: 'https://reliable-bullfrog-917.convex.site',
  ASSETS: { fetch() { throw new Error('Telemetry must never be served as an asset.'); } },
});
assert.equal(telemetry.status,503);
assert.equal((await telemetry.json()).code,'telemetry_not_configured');
const shell = await readFile('dist/app-shell.html','utf8');
assert.match(shell,/stage-page-loading/);
assert.doesNotMatch(shell,/stage-landing-page|rel="stylesheet" href="\/landing-preview\//);
const home = await readFile('dist/index.html','utf8');
assert.match(home,/stage-landing-page/);
assert.match(home,/rel="stylesheet" href="\/landing-preview\//);
console.log('Page shell checks passed: 12 routes, private robots, clean app shell and prerendered homepage.');
