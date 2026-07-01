const { chromium } = require("playwright");
const fs = require("fs");

const OUT = `followers-${new Date().toISOString().slice(0, 10)}.csv`;

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    storageState: fs.existsSync("ig-session.json") ? "ig-session.json" : undefined
  });

  const page = await context.newPage();

  await page.goto("https://www.instagram.com/", {
    waitUntil: "domcontentloaded"
  });

  console.log("\nLog in if needed, open your profile, click Followers.");
  console.log("When the Followers popup is open, press Enter here.\n");

  await new Promise(resolve => process.stdin.once("data", resolve));

  await context.storageState({ path: "ig-session.json" });

  await page.waitForSelector('div[role="dialog"]');

  const dialog = page.locator('div[role="dialog"]');

  const usernames = new Set();
  let lastSize = 0;
  let staleRounds = 0;

  while (staleRounds < 20) {
    const found = await dialog.locator('a[href^="/"]').evaluateAll(els =>
      els
        .map(a => a.getAttribute("href"))
        .filter(Boolean)
        .map(h => h.replaceAll("/", ""))
        .filter(u =>
          u &&
          !u.includes("?") &&
          !["explore", "accounts", "reels", "direct"].includes(u)
        )
    );

    for (const u of found) usernames.add(u);

    console.log(`Collected: ${usernames.size}`);

    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1000);

    if (usernames.size === lastSize) staleRounds++;
    else {
      staleRounds = 0;
      lastSize = usernames.size;
    }
  }

  const rows = ["username", ...Array.from(usernames).sort()];
  fs.writeFileSync(OUT, rows.join("\n"), "utf8");

  console.log(`\nDone. Saved ${usernames.size} usernames to ${OUT}`);

  await browser.close();
})();