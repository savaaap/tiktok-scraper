import puppeteer from "puppeteer";

const url = "https://www.instagram.com/kingjames/";
const scrollTimeout = 1000; // adjust as needed
const scraped = [];

const scrapeInstaProfile = async () => {
  const browser = await puppeteer.launch({ headless: false });
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
  const imgElement = await headerElement.$("img");
  const src = await imgElement.getProperty("src");
  const finalSrc = await src.jsonValue();
  console.log(finalSrc);
  await browser.close();
};

scrapeInstaProfile();
