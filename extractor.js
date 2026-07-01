const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes("instagram.com"));

  if (!page) throw new Error("No open Instagram tab found.");

  console.log("\nUsing the open ig profile tab.");
  console.log("Make sure the popup is open, then press Enter.");

  await new Promise(resolve => process.stdin.once("data", resolve));

  await page.waitForSelector('div[role="dialog"]', { timeout: 0 });

  const listType = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    const text = dialog?.innerText?.toLowerCase() || "";

    if (text.includes("following")) return "following";
    if (text.includes("followers")) return "followers";

    return "list";
  });

  const now = new Date();
  const extractsDir = path.join(__dirname, "extracts");
  fs.mkdirSync(extractsDir, { recursive: true });

  const fileName = `${MONTHS[now.getMonth()]}-${String(now.getDate()).padStart(2, "0")}-${now.getFullYear()}-${listType}.csv`;
  const OUT = path.join(extractsDir, fileName);

  const usernames = new Set();
  let lastSize = 0;
  let staleRounds = 0;
  let lastPrint = Date.now();

  while (staleRounds < 12) {
    const result = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) throw new Error("No dialog found.");

      const links = [...dialog.querySelectorAll('a[href^="/"]')]
        .map(a => a.getAttribute("href"))
        .filter(Boolean)
        .map(h => h.split("?")[0].replace(/^\/|\/$/g, ""))
        .filter(u =>
          u &&
          !u.includes("/") &&
          ![
            "explore",
            "accounts",
            "reels",
            "direct",
            "p",
            "stories"
          ].includes(u)
        );

      const scrollables = [...dialog.querySelectorAll("div")]
        .filter(el => el.scrollHeight > el.clientHeight + 50);

      const scroller = scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];

      if (!scroller) {
        return {
          links,
          didScroll: false,
          scrollTop: 0,
          scrollHeight: 0
        };
      }

      const before = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollHeight;

      return {
        links,
        didScroll: scroller.scrollTop !== before,
        scrollTop: scroller.scrollTop,
        scrollHeight: scroller.scrollHeight
      };
    });

    for (const u of result.links) usernames.add(u);

    if (Date.now() - lastPrint >= 5000) {
      console.log(`Collected: ${usernames.size} | scrollTop: ${result.scrollTop} / ${result.scrollHeight}`);
      lastPrint = Date.now();
    }

    await page.waitForTimeout(1200);

    if (usernames.size === lastSize && !result.didScroll) {
      staleRounds++;
    } else {
      staleRounds = 0;
      lastSize = usernames.size;
    }
  }

  fs.writeFileSync(OUT, ["username", ...Array.from(usernames).sort()].join("\n"), "utf8");

  console.log(`\nDone. Saved ${usernames.size} usernames to ${fileName}\n`);

  await browser.close();
  process.exit(0);
})();
