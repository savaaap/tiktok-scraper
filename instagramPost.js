import puppeteer from "puppeteer";

const url = "https://www.instagram.com/p/CsoKeLHuKWK/";
const scrollTimeout = 1000; // adjust as needed
const scraped = [];

const scrapeInstaPost = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  let previousHeight = 0;
  let currentHeight = await page.evaluate("document.body.scrollHeight");
  while (previousHeight < currentHeight) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, scrollTimeout));
    previousHeight = currentHeight;
    currentHeight = await page.evaluate("document.body.scrollHeight");
  }
  await page.waitForSelector('main[role="main"]');
  const headerElement = await page.$("header");
  // GET AVATAR
  const imgElement = await headerElement.$("img");
  const src = await imgElement.getProperty("src");
  const finalSrc = await src.jsonValue();
  // GET OWNER NAME
  await page.waitForSelector('a[role="link"]');
  const profileNameElement = await headerElement.$('a[role="link"]');
  const profileName = await page.evaluate((el) => {
    return el.textContent;
  }, profileNameElement);
  console.log(profileName);
  console.log({
    avatar: finalSrc,
    profileName,
  });
  await browser.close();
};

scrapeInstaPost();
