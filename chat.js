import puppeteer from "puppeteer-extra";
import UserAgent from "user-agents";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const userAgent = new UserAgent();

const url = "https://www.tiktok.com/search/video?q=brasil";
const loginUrl = "https://www.tiktok.com/login/phone-or-email/email";
const email = "ludwigfrez1939@gmail.com";
const pass = "ludwig1234.";
const scrollTimeout = 1000; // adjust as needed
const scraped = [];
const limit = 50;

async function extractUnixTimestamp(vidId) {
  // BigInt needed as we need to treat vidId as a 64-bit decimal. This reduces browser support.
  const asBinary = BigInt(vidId).toString(2);
  const first31Chars = asBinary.slice(0, 31);
  const timestamp = parseInt(first31Chars, 2);
  return timestamp;
}

function unixTimestampToHumanDate(timestamp) {
  const milliseconds = timestamp * 1000;
  const dateObject = new Date(milliseconds);
  const humanDateFormat = dateObject.toUTCString() + " (UTC)";
  return humanDateFormat;
}

function tiktokTimestamp(vidId) {
  const unixTimestamp = extractUnixTimestamp(vidId);
  const humanDateFormat = unixTimestampToHumanDate(unixTimestamp);
  return humanDateFormat;
}

const scrapeTikTok = async () => {
  puppeteer.use(StealthPlugin());
  puppeteer.launch({ headless: false }).then(async (browser) => {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent.random().toString());
    await page.goto(loginUrl);
    await page.waitForSelector("#loginContainer");
    await page.waitForSelector('input[name="username"]');
    // LOGIN
    await page.type('input[name="username"]', email);
    await page.type('input[type="password"]', pass);
    try {
      await Promise.all([
        page.waitForNavigation({ timeout: 5000 }), // Wait for navigation to complete
        page.click('button[type="submit"]'), // Trigger the login button click
      ]);
    } catch (e) {
      console.log(e);
    }

    // GO TO HASHTAG URL
    await page.goto(url);
    await page.waitForSelector("#main-content-search_video");

    let scrapedCount = 0;

    while (scrapedCount < limit) {
      console.log(scrapedCount);
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, scrollTimeout));
      const parentDiv = await page.$("#main-content-search_video");

      const videoUrls = await parentDiv.$$eval("a", (links) =>
        links.map((link) => {
          if (link.href.includes("/video")) {
            return link.href;
          }
          return null;
        })
      );
      const filteredVideos = videoUrls.filter((x) => x !== null);

      for (let v = 0; v < filteredVideos.length; v++) {
        console.log("im in");
        if (scraped.length >= limit) {
          break;
        }
        const final = {};
        final.url = filteredVideos[v];
        const splitUrl = final.url.split("/");
        final.videoId = splitUrl[splitUrl.length - 1];
        final.timestamp = tiktokTimestamp(final.videoId);

        await page.goto(filteredVideos[v]);
        await page.waitForSelector("#main-content-video_detail");

        // Rest of your scraping logic

        console.log(final);
        scraped.push(final);
        scrapedCount++;
      }
    }

    console.log(scraped.length);
    await browser.close();
  });
};

scrapeTikTok();
