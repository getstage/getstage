// Publish the website from your machine, without CI:
//   pnpm web:test  → testing.getstage.co (check it there first)
//   pnpm web:ship  → getstage.co
//
// getstage.co is whatever is on the `website` branch. Developers merge finished
// app work into it; everyone else may only ship changes to the marketing site.
//
// 1. You are on `website`, everything is committed, and you have the latest
//    commits from GitHub, so nobody's work is overwritten.
// 2. Non-developers: every new commit is their own and only touches the
//    marketing folders below. Otherwise nothing is deployed.
// 3. Prints exactly what goes out (commits and files).
// 4. Build: content.json and the SEO checks run here.
// 5. getstage.co only: push to GitHub first, then deploy that exact commit, so
//    every live version is in git. Cloudflare shows the commit on each deploy.
import { execFileSync } from "node:child_process";

const LIVE_BRANCH = "website";

const TARGETS = {
  testing: { site: "testing.getstage.co", build: "build:testing", pushToGitHub: false },
  production: { site: "getstage.co", build: "build:production", pushToGitHub: true },
};
const targetName = process.argv[2];
const target = TARGETS[targetName];
if (!target) {
  console.error(`Usage: node scripts/ship.mjs <${Object.keys(TARGETS).join("|")}>`);
  process.exit(1);
}

// Git author emails that may ship any change to the web app. This guards against
// mistakes, not people: git emails are self-declared, and anyone with Cloudflare
// deploy access can deploy directly. Access control is who holds those credentials.
const DEVELOPERS = new Set([
  "wdieben@users.noreply.github.com",
  "76756330+WDieben@users.noreply.github.com",
  "barnetv7@gmail.com",
  "169061220+VilemB@users.noreply.github.com",
]);

// What everyone else may change: content, marketing components and styling, public assets.
const MARKETING_PATHS = [
  "apps/web-application/src/marketing/",
  "apps/web-application/src/components/marketing/",
  "apps/web-application/src/components/stage-landing/",
  "apps/web-application/public/",
];

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function read(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function lines(output) {
  return output ? output.split("\n") : [];
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const branch = read("git", ["branch", "--show-current"]);
if (branch !== LIVE_BRANCH) {
  fail(`The website ships from "${LIVE_BRANCH}". You are on "${branch}". Run: git checkout ${LIVE_BRANCH}`);
}

if (read("git", ["status", "--porcelain"])) {
  fail('Commit your changes first: git add . && git commit -m "What you changed"');
}

run("git", ["fetch", "origin", LIVE_BRANCH]);
const live = `origin/${LIVE_BRANCH}`;
const behind = Number(read("git", ["rev-list", "--count", `HEAD..${live}`]));
if (behind > 0) {
  fail(`GitHub has ${behind} newer commit(s). Run "git pull --rebase", then ship again.`);
}

const commits = lines(read("git", ["log", "--format=%H%x09%ae%x09%an%x09%s", `${live}..HEAD`])).map((line) => {
  const [hash, email, name, subject] = line.split("\t");
  return { hash, email, name, subject };
});
if (commits.length === 0 && target.pushToGitHub) {
  fail("Nothing new to ship: getstage.co already runs this commit.");
}

const shipper = read("git", ["config", "user.email"]);
if (!DEVELOPERS.has(shipper)) {
  const problems = commits.flatMap((commit) => {
    const parents = read("git", ["show", "--no-patch", "--format=%P", commit.hash]).split(" ");
    if (parents.length > 1) {
      return [`${commit.hash.slice(0, 7)} is a merge commit. Undo it and use "git pull --rebase".`];
    }
    if (commit.email !== shipper) {
      return [`${commit.hash.slice(0, 7)} "${commit.subject}" is by ${commit.name}. Ask a developer to ship it.`];
    }
    const files = lines(read("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", commit.hash]));
    return files
      .filter((file) => !MARKETING_PATHS.some((allowed) => file.startsWith(allowed)))
      .map((file) => `${commit.hash.slice(0, 7)} "${commit.subject}" changes ${file}, which belongs to the app.`);
  });
  if (problems.length > 0) {
    fail(
      `Not shipped. You can change the website folders only:\n  ${MARKETING_PATHS.join("\n  ")}\n\n` +
        `- ${problems.join("\n- ")}\n\nAsk Werner to ship app changes.`,
    );
  }
}

console.log(`\nDeploying ${commits.length} new commit(s) to ${target.site}:`);
for (const commit of commits) console.log(`  ${commit.hash.slice(0, 7)}  ${commit.name}: ${commit.subject}`);
console.log("\nFiles:");
console.log(read("git", ["diff", "--stat", `${live}..HEAD`]));
console.log();

run("pnpm", ["run", target.build]);
if (target.pushToGitHub) run("git", ["push", "origin", LIVE_BRANCH]);

const commit = read("git", ["rev-parse", "--short", "HEAD"]);
const subject = read("git", ["log", "-1", "--format=%s"]);
run("pnpm", ["exec", "wrangler", "deploy", "-e", targetName, "--tag", commit, "--message", subject]);

console.log(`\n✔ ${target.site} is live at ${commit}: ${subject}`);
if (!target.pushToGitHub) console.log("  Looks good? Run: pnpm web:ship");
console.log();
