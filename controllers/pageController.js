import fs from "fs";
import pageScraper from "../pageScraper.js";
async function scrapeAll(browserInstance) {
  let browser;
  try {
    browser = await browserInstance;
    let scrapedData = {};
    scrapedData = await pageScraper.scraper(browser);
    await browser.close();

    fs.writeFile(
      "data.json",
      JSON.stringify(scrapedData?.filter((x) => x)),
      "utf8",
      function (err) {
        if (err) {
          return console.log(err);
        }
        console.log(
          "The data has been scraped and saved successfully! View it at './data.json'"
        );
      }
    );
  } catch (err) {
    console.log("Could not resolve the browser instance => ", err);
  }
}

const pageController = (browserInstance) => scrapeAll(browserInstance);

export default pageController;
