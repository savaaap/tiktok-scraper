import puppeteer from "puppeteer";

const url = "https://www.tiktok.com/search/video?q=traveling";
const scrollTimeout = 1500; // adjust as needed
const scraped = [];
const limit = 10;

function extractUnixTimestamp(vidId) {
  // BigInt needed as we need to treat vidId as 64 bit decimal. This reduces browser support.
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

const config = {
  headless: false,
  slowMo: 10,
  defaultViewport: null,
};

const scrapeTikTok = async () => {
  const browser = await puppeteer.launch(config);
  const page = await browser.newPage();
  await page.goto(url);
  console.log(`Connected to ${url}`);
  await page.waitForTimeout(5000);

  let previousHeight = 0;
  let currentHeight = await page.evaluate("document.body.scrollHeight");
  while (previousHeight < currentHeight) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, scrollTimeout));
    previousHeight = currentHeight;
    currentHeight = await page.evaluate("document.body.scrollHeight");
  }
  await page.waitForSelector("#main-content-search_video");
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
  console.log(filteredVideos.length);
  for (let v = 0; v < filteredVideos.length; v++) {
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
    // IMAGES
    const imgElements = await page.$$("#main-content-video_detail img");
    for (let i = 0; i < imgElements.length; i++) {
      const imgElement = imgElements[i];
      const src = await imgElement.getProperty("src");
      if (i === 1) {
        final.thumbnail = await src.jsonValue();
        const alt = await imgElement.getProperty("alt");
        final.desc = await alt.jsonValue();
      }
      if (i === imgElements.length - 1) {
        final.avatar = await src.jsonValue();
      }
    }
    // LIKES AND COMMENTS
    const likeElement = await page.$(`strong[data-e2e="like-count"]`);
    const like = await page.evaluate(
      (element) => element.textContent,
      likeElement
    );
    final.likes = like;
    const commentElement = await page.$(`strong[data-e2e="comment-count"]`);
    const comment = await page.evaluate(
      (element) => element.textContent,
      commentElement
    );
    final.comments = comment;
    const shareElement = await page.$(`strong[data-e2e="share-count"]`);
    const share = await page.evaluate(
      (element) => element.textContent,
      shareElement
    );
    final.shares = share;
    // CREATOR NAME
    const nameElemenet = await page.$('span[data-e2e="browse-username"]');
    const name = await page.evaluate((el) => {
      return el?.textContent;
    }, nameElemenet);
    final.creatorName = name;
    console.log(final);
    scraped.push(final);
  }
  console.log(scraped.length);
  await browser.close();
};

scrapeTikTok();

// 1684256400&x
