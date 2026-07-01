const fs = require("fs");
const path = require("path");

const extractsDir = path.join(__dirname, "extracts");

const files = fs.readdirSync(extractsDir)
  .filter(f => f.endsWith(".csv"));

const groups = {};

for (const file of files) {
  const match = file.match(/^([A-Z][a-z]{2}-\d{2}-\d{4})-(followers|following)\.csv$/);
  if (!match) continue;

  const [, date, type] = match;

  groups[date] ??= {};
  groups[date][type] = file;
}

const latest = Object.entries(groups)
  .filter(([, g]) => g.followers && g.following)
  .sort(([a], [b]) => new Date(b) - new Date(a))[0];

if (!latest) {
  console.log("No matching followers/following file pair found.");
  process.exit(1);
}

const [date, pair] = latest;

function readUsernames(file) {
  return new Set(
    fs.readFileSync(path.join(extractsDir, file), "utf8")
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean)
      .filter(x => x !== "username")
  );
}

const followers = readUsernames(pair.followers);
const following = readUsernames(pair.following);

const notFollowingBack = [...following]
  .filter(u => !followers.has(u))
  .sort();

const notFollowedBack = [...followers]
  .filter(u => !following.has(u))
  .sort();

console.log(`\nUsing ${date}\n`);
console.log(`Followers: ${followers.size}`);
console.log(`Following: ${following.size}`);

console.log(`\nNot following me (${notFollowingBack.length}):\n`);
console.log(notFollowingBack.join("\n") || "(none)");

console.log(`\nI am not following (${notFollowedBack.length}):\n`);
console.log(notFollowedBack.join("\n") || "(none)");
console.log();