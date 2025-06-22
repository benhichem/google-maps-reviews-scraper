/**
 * Google Maps Reviews Scraper
 * ==========================
 *
 * A TypeScript-based scraper that extracts reviews from Google Maps listings.
 * Uses Puppeteer with stealth mode to avoid detection and bypass bot protection.
 *
 * Features:
 * - Stealth browser configuration to avoid detection
 * - Automatic filtering of reviews by lowest ratings
 * - Dynamic scrolling to load more reviews
 * - Language support (defaults to English)
 * - Detailed review data extraction
 *
 * @package google-maps-reviews-scraper
 * @author Benhichem
 * @version 1.0.0
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import { ScraperReviews } from "./ScrapeReviewsUpdate";

type ReviewType = {
  id: string;
  reviewName: string;
  starRating: string;
  responseFromOwner: boolean;
  reviewText: string;
  isHighRating: boolean;
  reviewPostedAt: string;
  starLabel: string;
  shareUrl: string;
};

type FilterByType =
  | "Lowest rating"
  | "Highest rating"
  | "Newest"
  | "Most relevant";

/**
 * Utility function to create a delay in milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new browser instance with stealth configuration
 * @returns {Promise<{ Browser: Browser; Page: Page }>} - Promise resolving to browser and page objects
 * @throws {Error} If browser launch fails
 */
async function BrowserInstance(): Promise<{ Browser: Browser; Page: Page }> {
  try {
    puppeteer.use(StealthPlugin());

    puppeteer.use(
      require("puppeteer-extra-plugin-user-preferences")({
        userPrefs: {
          webkit: {
            webprefs: {
              default_font_size: 16,
            },
          },
        },
      })
    );
    const browser = await puppeteer.launch({
      headless: false, // Set to false if you want to see the browser
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--accept-land=en-US",
        "--local=en-US",
      ],
      /*  env: {
      // Set environment variables if needed}
      language: "en-US,en;q=0.9", // Example: Set language to English
    }, */
    });
    /*   let url = await devtools().createTunnel(browser).url;
  console.log(url); */
    /* devtools.getLocalDevToolsUrl(browser); */

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en",
    });
    // Spoof navigator.language and navigator.languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "language", { get: () => "en-US" });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    // Clear cookies and local storage
    const client = await page.createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await client.send("Network.clearBrowserCache");
    await client.send("Emulation.setLocaleOverride", {
      locale: "de_DE", // ICU style C locale
    });

    return { Browser: browser, Page: page };
  } catch (error) {
    console.error("Error creating browser instance:", error);
    throw new Error("Failed to create browser instance");
  }
}

/**
 * Filters reviews on Google Maps page to show lowest ratings first
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<void>}
 * @throws {Error} If sort button or lowest rating button cannot be found
 */
async function FilterBy(page: Page, filterBy: FilterByType) {
  return await page.evaluate(async (filterBy) => {
    function delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    try {
      let sortBtn = [...document.querySelectorAll("button")].filter((item) =>
        item.innerText.includes("Sort")
      );
      if (sortBtn.length === 0) throw new Error("Sort button not found");
      sortBtn[0].click();
      await delay(5000);

      let lowestRatingBtn = [
        ...document.querySelectorAll('div[aria-checked="false"]'),
      ].filter((item) => (item as HTMLElement).innerText.includes(filterBy));
      if (lowestRatingBtn.length === 0) {
        throw new Error(`${filterBy} button not found`);
      }
      (lowestRatingBtn[0] as HTMLElement).click();
      await delay(5000);
    } catch (error) {
      console.log(error);
    }
  }, filterBy);
}

/**
 * Scrolls through the Google Maps reviews page to load more reviews
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<void>}
 * @throws {Error} If scroll container cannot be found
 */
async function ScrapeReviews(page: Page) {
  let isScrolling = true;
  const scrapedReviews: Map<string, any> = new Map();
  let processedElementsCount = 0; // KEY: Track how many elements we've processed
  let noNewElementsCount = 0;
  const MAX_NO_NEW_ELEMENTS = 3;

  const SCROLL_CONTAINER_SELECTOR =
    "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde";

  const REVIEW_ELEMENT_SELECTOR = "div.jftiEf";

  while (isScrolling) {
    try {
      const reviewsData = await page.evaluate(
        async (selectors, processedCount) => {
          const { containerSelector, reviewSelector } = selectors;

          function delay(ms: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, ms));
          }

          // Scroll the container
          const container = document.querySelector(containerSelector);

          if (!container) {
            throw new Error("Scroll container not found");
          }

          container.scrollBy(0, 2000);
          await delay(3000);

          const scrapedReviews: Array<any> = [];

          // Get ALL elements from the page
          const allElements = [...document.querySelectorAll(reviewSelector)];

          // CORE SOLUTION: Only process elements we haven't seen before
          const newElements = allElements.slice(processedCount);

          console.log(`Total elements on page: ${allElements.length}`);
          console.log(`Previously processed: ${processedCount}`);
          console.log(`New elements to process: ${newElements.length}`);

          // Get review text
          // Process only the NEW elements
          for (const ele of newElements) {
            try {
              // Get review name
              const nameButtons = ele.querySelectorAll("button");
              if (nameButtons.length < 2) continue;

              const reviewName = nameButtons[1].innerText.split("\n")[0];
              if (!reviewName) continue;
              console.log(`Processing review by: ${reviewName}`);
              // Handle "Plus" button to expand review
              const buttons = ele.querySelectorAll("button");
              const plusBtn = buttons[3];
              if (plusBtn?.innerText.includes("More")) {
                plusBtn.click();
                await delay(2000);
              }

              ele.querySelectorAll("button")[2].click();
              await delay(2000);

              (
                document.querySelector(
                  'div[aria-checked="false"]'
                )! as HTMLElement
              ).click();

              await delay(2000);

              let shareUrl = (
                document.querySelector("input[type]") as HTMLInputElement
              ).value;

              (document.querySelector("button")! as HTMLElement).click();

              const reviewTextElement = ele.querySelector(
                "div.MyEned"
              ) as HTMLElement;

              const reviewText =
                reviewTextElement?.innerText || "No review text found";

              // Get review rating
              const starElements = [...ele.querySelectorAll("span")].filter(
                (item) =>
                  item.getAttribute("aria-label")?.trim().includes("star")
              );

              if (starElements.length === 0) continue;

              const starLabel = starElements[0].getAttribute("aria-label");
              const starRating = starLabel?.split(" ")[0];
              console.log(`Star rating: ${starRating}`);

              // Check if it's a high rating (4 or 5 stars)
              const isHighRating =
                starLabel?.includes("4") || starLabel?.includes("5");

              console.log(isHighRating);
              // Create unique identifier
              const reviewId = `${reviewName}_${reviewText.substring(0, 50)}`;
              let responseFromOwner =
                [...ele.querySelectorAll("div")].filter((item) =>
                  item.innerText.includes("Response from the owner")
                ).length > 0
                  ? true
                  : false;

              let dateElement = [...ele.querySelectorAll("span")].filter(
                (item) => item.innerText.trim().toUpperCase().includes("AGO")
              );

              let reviewPostedAt =
                dateElement.length > 0
                  ? dateElement[0].innerText
                  : "Unknown date";

              scrapedReviews.push({
                id: reviewId,
                reviewName,
                reviewPostedAt,
                starRating,
                responseFromOwner,
                reviewText,
                isHighRating,
                starLabel,
                shareUrl,
              });

              console.log(`Scraped NEW review: `);
              console.log({
                id: reviewId,
                reviewName,
                starRating,
                responseFromOwner,
                reviewText,
                isHighRating,
                starLabel,
                shareUrl,
              });
            } catch (reviewError) {
              console.warn("Error processing individual review:", reviewError);
              continue;
            }
          }

          container.scrollBy(0, 2000);
          container.scrollBy(0, 2000);

          await delay(3000);

          return {
            reviews: scrapedReviews,
            totalElements: allElements.length,
            newElementsProcessed: newElements.length,
          };
        },
        {
          containerSelector: SCROLL_CONTAINER_SELECTOR,
          reviewSelector: REVIEW_ELEMENT_SELECTOR,
        },
        processedElementsCount
      ); // Pass the current count to the evaluate function

      if (!reviewsData) {
        console.log("No review data returned");
        break;
      }

      const { reviews, totalElements, newElementsProcessed } = reviewsData;
      console.log(reviews);
      // UPDATE: Set our processed count to the total elements found
      processedElementsCount = totalElements;

      let newReviewsAdded = 0;

      // Process the new reviews
      for (const review of reviews) {
        if (!scrapedReviews.has(review.id)) {
          scrapedReviews.set(review.id, review);
          newReviewsAdded++;

          // Track consecutive high ratings
          if (review.isHighRating) {
            isScrolling = false;
            break;
          }
        }
      }

      console.log(`New elements processed: ${newElementsProcessed}`);
      console.log(`New reviews added: ${newReviewsAdded}`);
      console.log(`Total unique reviews: ${scrapedReviews.size}`);

      // Stopping condition 2: No new elements processed
      if (newElementsProcessed === 0) {
        noNewElementsCount++;
        if (noNewElementsCount >= MAX_NO_NEW_ELEMENTS) {
          console.log(
            "Stopping: No new elements found for multiple iterations"
          );
          isScrolling = false;
          break;
        }
      } else {
        noNewElementsCount = 0; // Reset counter
      }

      // Safety limit
      if (scrapedReviews.size > 1000) {
        console.log("Stopping: Maximum review limit reached");
        isScrolling = false;
        break;
      }

      // Wait before next scroll iteration
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Error in scroll iteration:", error);
      isScrolling = false;
      break;
    }
  }

  // Return the final results
  const finalReviews = Array.from(scrapedReviews.values());
  console.log(`Scraping completed. Total reviews: ${finalReviews.length}`);

  return [...finalReviews] as Array<ReviewType>;
}
/**
 * Navigates to the reviews tab on Google Maps page
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<void>}
 */
async function ReviewsTab(page: Page) {
  try {
    await page.evaluate(() => {
      let reviewBtn = [
        ...document.querySelectorAll('button[role="tab"]'),
      ].filter((item) => (item as HTMLElement).innerText.includes("Reviews"));
      if (reviewBtn.length === 0) {
        throw new Error("Review Tab not Found ...");
      }
      (reviewBtn[0] as HTMLElement).click();
    });
  } catch (error) {
    throw new Error("Review Tab not Found ...");
  }
}

/**
 * Adds language parameter to Google Maps URL
 * @param {string} url - Original Google Maps URL
 * @param {string} [language="en"] - Language code to add (default: "en")
 * @returns {string} URL with added language parameter
 */
function addLanguageToMapsUrl(url: string, language = "en") {
  const urlObj = new URL(url);
  urlObj.searchParams.set("hl", language);
  return urlObj.toString();
}

/**
 * Main function to scrape Google Maps reviews
 * @param {string} url - Google Maps URL to scrape
 * @returns {Promise<Array<ReviewType>>} Array of scraped reviews
 * @throws {Error} If URL is invalid or scraping fails
 */
async function scrapeGoogleMapsReviews(url: string) {
  try {
    const { Browser, Page } = await BrowserInstance();
    await Page.goto(url);
    url = addLanguageToMapsUrl(url, "en"); // Add language parameter to the URL
    await Page.goto(url, {
      waitUntil: "networkidle2", // Wait until the network is idle
    });

    await ReviewsTab(Page);
    await FilterBy(Page, "Lowest rating");
    await Page.evaluate(() => {
      document
        .querySelector(
          "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde"
        )!
        .scrollBy(0, 500);
    });
    await Page.waitForSelector("div.jftiEf", { timeout: 10000 }).catch(() => {
      console.error("Reviews not found within the timeout period.");
    }); // Wait for reviews to load

    let finalReviews = await ScraperReviews(Page);
    console.log("Final reviews:", finalReviews);
    await Page.close();
    await Browser.close();
    return finalReviews.filter((item) => {
      item.isHighRating === false;
    });
  } catch (error) {
    console.error(
      "An error occurred while scraping Google Maps reviews:",
      error
    );
  }
}

/**
 * Scrapes the newest Google Maps reviews for a given location URL, filtered by a specific date.
 *
 * This function navigates to the provided Google Maps URL, ensures the language is set to English,
 * switches to the reviews tab, applies the "Newest" filter, scrolls to load more reviews, and then
 * scrapes reviews that match the specified date and high rating criteria.
 *
 * @param url - The Google Maps location URL to scrape reviews from.
 * @param date - The date string to filter reviews by (required).
 * @throws Will throw an error if the `date` parameter is empty or if any step in the scraping process fails.
 */
async function scrapeNewGoogleMapsReviews(url: string, date: string) {
  try {
    if (date === "") {
      throw new Error("Date parameter is required");
    }

    const { Page, Browser } = await BrowserInstance();
    url = addLanguageToMapsUrl(url, "en"); // Add language parameter to the URL
    await Page.goto(url, {
      waitUntil: "networkidle2", // Wait until the network is idle
    });
    await ReviewsTab(Page);
    await FilterBy(Page, "Newest");

    await Page.evaluate(() => {
      document
        .querySelector(
          "#QA0Szd > div > div > div.w6VYqd > div.bJzME.tTVLSc > div > div.e07Vkf.kA9KIf > div > div > div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde"
        )!
        .scrollBy(0, 500);
    });

    await Page.waitForSelector("div.jftiEf", { timeout: 10000 }).catch(() => {
      console.error("Reviews not found within the timeout period.");
    }); // Wait for reviews to load
    /* let finalReviews = await ScrapeReviews(Page); */
    let finalReviews = await ScraperReviews(Page, date);
    console.log("Final reviews:", finalReviews);
    await Page.close();
    await Browser.close();
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "An error occurred while scraping Google Maps New reviews:",
        error.message
      );
    }
  }
}

/**
 * Checks if a Google Maps review at the specified URL has been deleted.
 *
 * This function launches a browser instance, navigates to the provided review URL (with language set to English),
 * and evaluates the page to determine if the review is no longer available. It looks for a specific message
 * indicating deletion. The browser and page are closed after the check.
 *
 * @param url - The URL of the Google Maps review to check.
 * @returns A promise that resolves to `true` if the review is deleted, or `false` otherwise.
 *
 */
async function IsReviewDelted(url: string) {
  // Launch a new browser and page instance
  const { Browser, Page } = await BrowserInstance();
  url = addLanguageToMapsUrl(url, "en"); // Add language parameter to the URL
  // Navigate to the review URL and wait until the network is idle
  await Page.goto(url, {
    timeout: 0,
    waitUntil: "networkidle2",
    // Wait until the network is idle
  });

  // Evaluate the page to check for the "review deleted" message
  let IsItDeleted = await Page.evaluate(() => {
    // Look for the paragraph element that contains the deletion message
    let Paragraph = document.querySelector("p.fontHeadlineSmall");
    if (!Paragraph) {
      // If the element is not found, throw an error
      return false;
    }
    // Check if the paragraph contains the "no longer available" message
    return (Paragraph as HTMLElement).innerText.includes(
      "This review is no longer available."
    )
      ? true
      : false;
  });

  console.log(`Is The review delete :: ${IsItDeleted}`);
  // Close the page and browser
  await Page.close();
  await Browser.close();

  // Return whether the review is deleted
  return IsItDeleted;
}

// example usage
/* scrapeNewGoogleMapsReviews(
  "https://www.google.com/maps/place/Happy+Space/@36.7699149,3.0556949,17z/data=!4m6!3m5!1s0x128fb34f276984e9:0xfbc1eb3fa4636eae!8m2!3d36.7699364!4d3.0556584!16s%2Fg%2F11rc6xjp22?entry=ttu&g_ep=EgoyMDI1MDYxNS4wIKXMDSoASAFQAw%3D%3D",
  "a year ago"
); */
/* IsReviewDelted(
  "https://www.google.com/maps/reviews/@48.8554457,2.3282572,17z/data=!3m1!4b1!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2xjelNYRm9UMEYzUkdGak0wbGZaRmhDTlVOMk0yYxAB!2m1!1s0x0:0x59c01ef1420685f7?entry=ttu&g_ep=EgoyMDI1MDYxNy4wIKXMDSoASAFQAw%3D%3D"
);
 */
/* scrapeGoogleMapsReviews(
  "https://www.google.com/maps/place/Happy+Space/@36.7699149,3.0556949,17z/data=!4m6!3m5!1s0x128fb34f276984e9:0xfbc1eb3fa4636eae!8m2!3d36.7699364!4d3.0556584!16s%2Fg%2F11rc6xjp22?entry=ttu&g_ep=EgoyMDI1MDYxNS4wIKXMDSoASAFQAw%3D%3D"
);
 */

export default {
  scrapeGoogleMapsReviews,
  scrapeNewGoogleMapsReviews,
  IsReviewDelted,
};
