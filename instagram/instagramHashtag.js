import puppeteer from "puppeteer";

const url = "https://www.instagram.com/explore/tags/music/";
const scrollTimeout = 2000; // adjust as needed
const scraped = [];
const baseUrl = "https://www.instagram.com";
const limit = 5;
const config = {
  headless: false,
  defaultViewport: null,
};

let scrollCount = 0;
const maxScrollCount = 1;

const scrapeInstaPost = async (url, baseUrl, limit) => {
  const browser = await puppeteer.launch(config);
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.waitForSelector("#loginForm");

  // LOGIN
  await page.type('input[name="username"]', "john_testing12345678", {
    delay: 100,
  });
  await page.type('input[name="password"]', "nortik12345678!", { delay: 100 });

  await Promise.all([
    page.waitForNavigation(), // Wait for navigation to complete
    page.click('button[type="submit"]'), // Trigger the login button click
  ]);

  console.log("Logged in!");

  // GO TO HASHTAG URL
  await page.goto(url);

  console.log(`Connected to ${url}`);

  await page.waitForSelector('main[role="main"]');
  const mainElement = await page.$('main[role="main"]');

  let previousHeight = 0;
  let currentHeight = await page.evaluate("document.body.scrollHeight");
  while (previousHeight < currentHeight && scrollCount < maxScrollCount) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, scrollTimeout));
    previousHeight = currentHeight;
    currentHeight = await page.evaluate("document.body.scrollHeight");
    console.log(scrollCount);
    scrollCount++;
  }
  const linkElements = await mainElement.$$('a[role="link"]');
  const final = await Promise.all(
    linkElements.map(async (element) => {
      let res = {
        href: "",
        displayUrl: "",
      };
      const hrefHandle = await element.getProperty("href");
      const href = await hrefHandle.jsonValue();
      res.href = href;
      const imgElement = await element.$("img");
      const src = await imgElement.getProperty("src");
      const displayUrl = await src.jsonValue();
      res.displayUrl = displayUrl;
      return res;
    })
  );

  for (let i = 0; i < final.length; i++) {
    if (scraped.length === limit) {
      break;
    }
    let hit = {};
    hit.postUrl = final[i].href;
    hit.displayUrl = final[i].displayUrl;
    try {
      await page.goto(hit.postUrl);
      await page.waitForSelector('main[role="main"]');
      await page.waitForSelector("header");
      //  GET AVATAR
      const headerElement = await page.$("header");
      const avatarElement = await headerElement.$("img");
      const avatarSrc = await avatarElement.getProperty("src");
      const avatarUrl = await avatarSrc.jsonValue();
      hit.avatarUrl = avatarUrl;
      // GET OWNER NAME
      await page.waitForSelector("h2");
      const profileNameElement = await page.$("h2");
      const profileName = await page.evaluate((el) => {
        return el?.textContent;
      }, profileNameElement);
      hit.profileName = profileName;
      // GET CAPTION
      const captionElement = await page.$("h1");
      const caption = await page.evaluate((el) => {
        return el?.textContent;
      }, captionElement);
      hit.description = caption;
      // GET ID
      const splitUrl = hit.postUrl.split("/");
      const id = splitUrl[splitUrl.length - 2];
      hit.id = id;
      // GET DATE
      const timeElement = await page.$("time");
      const datetime = await timeElement.getProperty("dateTime");
      const date = await datetime.jsonValue();
      hit.date = date;
      // GET LIKES
      // https://www.instagram.com/p/Css2D-fMe5z/liked_by/
      // TODO Find some better way to get likes count
      const newLikeElements = await page.$$('a[role="link"]');
      let likesCount = 0;
      await Promise.all(
        newLikeElements.map(async (element) => {
          const text = await page.evaluate((el) => el?.textContent, element);
          if (text.includes("likes")) {
            likesCount = text;
          }
        })
      );
      hit.likesCount = likesCount.split(" ")[0];
      console.log({ likesCount });
      scraped.push(hit);
    } catch (e) {
      console.log(e);
      continue;
    }
  }

  await browser.close();
};

scrapeInstaPost(url, baseUrl, limit);

// HIT = {
//   id, *
//   postUrl, *
//   displayUrl, *
//   avatarUrl, *
//   creatorName, *
//   description, *
//   date, *
//   likesCount, *
// };
