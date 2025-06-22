import { Page } from "puppeteer";
import { isDateBefore, parseRelativeDate } from "./dates";
import { inspect } from "node:util";

type ReviewType = {
  id: string;
  reviewName: string;
  starRating: string;
  responseFromOwner: boolean;
  reviewText: string;
  reviewPostedAt: string;
  isHighRating: boolean;
  starLabel: string;
  shareUrl: string;
};

export async function ScraperReviews(
  page: Page,
  lastScrapedDate?: string
): Promise<Array<ReviewType>> {
  try {
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
                console.warn(
                  "Error processing individual review:",
                  reviewError
                );
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
          if (lastScrapedDate) {
            const isStopedAt = isDateBefore(
              parseRelativeDate(review.reviewPostedAt),
              parseRelativeDate(lastScrapedDate)
            );

            if (isStopedAt === true) {
              if (review.isHighRating === true) continue;
              if (!scrapedReviews.has(review.id)) {
                scrapedReviews.set(review.id, review);
                newReviewsAdded++;
                inspect(`New review added: ${review.id}`, {
                  showHidden: false,
                  depth: null,
                  colors: true,
                });
              }
            } else {
              console.log(
                `Review ${review.id} is after the last scraped date, stopping...`
              );
              isScrolling = false;
            }
          }
          if (lastScrapedDate === undefined) {
            const isHighRating = review.isHighRating;
            if (isHighRating === true) {
              isScrolling = false;
              break;
            } else {
              if (!scrapedReviews.has(review.id)) {
                scrapedReviews.set(review.id, review);
                newReviewsAdded++;
                inspect(`New review added: ${review.id}`, {
                  showHidden: false,
                  depth: null,
                  colors: true,
                });
              }
            }
          }
        }

        console.log(`New elements processed: ${newElementsProcessed}`);
        console.log(`New reviews added: ${newReviewsAdded}`);
        console.log(`Total unique reviews: ${scrapedReviews.size}`);
        // Stopping condition 1: No new elements processed

        if (newElementsProcessed === 0) {
          noNewElementsCount++;

          if (noNewElementsCount >= MAX_NO_NEW_ELEMENTS) {
            console.log(
              "Stopping: No new elements found for multiple iterations"
            );
            isScrolling = false;
          }
        } else {
          noNewElementsCount = 0; // Reset counter
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Error in scroll iteration:", error);
        isScrolling = false;
        break;
      }
    }
    // Return the final results
    let finalReviews: Array<ReviewType> = Array.from(scrapedReviews.values());
    finalReviews.filter((item) => item.isHighRating === false);
    console.log(`Scraping completed. Total reviews: ${finalReviews.length}`);

    return [...finalReviews] as Array<ReviewType>;
  } catch (error) {
    console.error("Error during scraping:", error);
    return [];
  }
}
