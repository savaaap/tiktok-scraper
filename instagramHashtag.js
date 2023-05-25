import puppeteer from "puppeteer";

const url = "https://www.instagram.com/explore/tags/money/";
const scrollTimeout = 1000; // adjust as needed
const scraped = [];
const baseUrl = "https://www.instagram.com";
const limit = 30;

const scrapeInstaPost = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.waitForSelector("#loginForm");

  // LOGIN
  await page.type('input[name="username"]', "john_testing12345678");
  await page.type('input[name="password"]', "nortik12345678!");

  await Promise.all([
    page.waitForNavigation(), // Wait for navigation to complete
    page.click('button[type="submit"]'), // Trigger the login button click
  ]);

  // GO TO HASHTAG URL
  await page.goto(url);

  await page.waitForSelector('main[role="main"]');
  const mainElement = await page.$('main[role="main"]');

  let previousHeight = 0;
  let currentHeight = await page.evaluate("document.body.scrollHeight");
  while (previousHeight < currentHeight) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, scrollTimeout));
    previousHeight = currentHeight;
    currentHeight = await page.evaluate("document.body.scrollHeight");
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
    if (i === limit) {
      break;
    }
    let hit = {};
    hit.postUrl = final[i].href;
    hit.displayUrl = final[i].displayUrl;
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
    console.log(hit);
    scraped.push(hit);
  }

  //   for (let i = 0; i < linkElements.length; i++) {
  //     if (i === limit) {
  //       break;
  //     }
  //     let hit = {};
  //     const hrefHandle = await linkElements[i].getProperty("href");
  //     const href = await hrefHandle.jsonValue();
  //     hit.postUrl = href;
  //     const imgElement = await linkElements[i].$("img");
  //     const src = await imgElement.getProperty("src");
  //     const displayUrl = await src.jsonValue();
  //     hit.displayUrl = displayUrl;

  //     await page.goto(hit.postUrl);
  //     await page.waitForSelector('main[role="main"]');
  //     await page.waitForSelector("header");
  //     // GET AVATAR
  //     const headerElement = await page.$("header");
  //     const avatarElement = await headerElement.$("img");
  //     const avatarSrc = await avatarElement.getProperty("src");
  //     const avatarUrl = await avatarSrc.jsonValue();
  //     hit.avatarUrl = avatarUrl;
  //     // GET OWNER NAME
  //     await page.waitForSelector("h2");
  //     const profileNameElement = await page.$("h2");
  //     const profileName = await page.evaluate((el) => {
  //       return el?.textContent;
  //     }, profileNameElement);
  //     hit.profileName = profileName;
  //     // GET CAPTION
  //     const captionElement = await page.$("h1");
  //     const caption = await page.evaluate((el) => {
  //       return el?.textContent;
  //     }, captionElement);
  //     console.log(caption);
  //     scraped.push(hit);
  //   }

  await browser.close();
};

scrapeInstaPost();
