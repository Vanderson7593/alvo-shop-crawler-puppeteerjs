import startBrowser from "./browser.js";
import scraperController from "./controllers/pageController.js";

//Start the browser and create a browser instance
const browserInstance = startBrowser();

// Pass the browser instance to the scraper controller
scraperController(browserInstance);
