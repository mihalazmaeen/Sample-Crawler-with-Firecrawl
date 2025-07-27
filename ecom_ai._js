// index.js (Enhanced E-commerce Crawler with AI Extraction)

import "dotenv/config";
import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import fs from "fs";
import path from "path";

// --- Configuration ---
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlApiKey) {
  console.error(
    "Error: FIRECRAWL_API_KEY is not set. Please create a .env file."
  );
  process.exit(1);
}

// --- CONTROLS FOR TESTING ---
const MAX_PRODUCTS_TO_SCRAPE = null;
const SCRAPE_ALL_PAGES = true;

// --- Retry Logic Configuration ---
const MAX_PASSES = 3;
const BASE_DELAY_MS = 6500;

const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// --- Define Product Schema with Zod ---
const productSchema = z.object({
  product_name: z.string(),
  vendor: z.string(),
  price: z.string(),
  available_sizes: z.array(z.string()).optional(),
  available_colors: z.array(z.string()).optional(),
  material: z.string().optional(),
  measurement: z.string().optional(),
  description: z.string().optional(),
  image_urls: z.array(z.string().url()).optional(), // Expect an array of URL strings
  specifications: z.array(z.string()).optional(), // Added for any additional specs
  // --- NEW: Added fields for refinement ---
  size_chart_image_url: z.string().url().optional(),
  about_the_brand: z.string().optional(),
  shipping_and_returns: z.string().optional(),
});

// --- URLs TO PROCESS ---
const collectionUrls = [
Your URL's here 
];

/**
 * Main function to iterate through collections and crawl them.
 */
async function crawlAllCollections() {
  console.log(
    `🚀 Starting E-commerce Crawl for ${collectionUrls.length} collection(s)...`
  );
  const outputDir = path.join("output");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const baseCollectionUrl of collectionUrls) {
    const categoryName = baseCollectionUrl.split("/collections/")[1];
    console.log(`\n\n=================================================`);
    console.log(`   Processing Collection: ${categoryName}`);
    console.log(`=================================================`);

    try {
      // Step 1: Get all product URLs
      const urlsToProcess = await getProductUrls(baseCollectionUrl);
      if (urlsToProcess.length === 0) continue;

      // Step 2: Scrape each URL with Retry Logic
      const { successful, failed } = await scrapeProductData(urlsToProcess);
      if (successful.length === 0) {
        console.error("❌ No product data was scraped for this collection.");
        continue;
      }

      // Step 3: Combine data into Markdown file
      generateMarkdownFile(successful, categoryName, outputDir);

      // Final report for the collection
      console.log("\n--- Collection Complete ---");
      console.log(`- ✅ Scraped and saved: ${successful.length} products.`);
      if (failed.length > 0) {
        console.error(`- ❌ Permanently failed: ${failed.length} products.`);
        failed.forEach((url) => console.log(`  - ${url}`));
      } else {
        console.log("- ✅ No failed pages after all retries!");
      }
    } catch (error) {
      console.error(
        `\nA critical error occurred during the processing of ${categoryName}:`,
        error
      );
    }
  }
  console.log("\n\n🎉 All collections processed!");
}

async function getProductUrls(baseCollectionUrl) {
  console.log(`\n--- Step 1: Finding all product links... ---`);
  const allProductUrls = new Set();
  let page = 1;
  while (true) {
    const currentPageUrl = `${baseCollectionUrl}?page=${page}`;
    console.log(`- Scraping link list from page ${page}...`);
    const collectionPage = await app.scrapeUrl(currentPageUrl, {
      pageOptions: {
        waitForSelector: ".product-list",
        smartRotation: true,
        blockAds: false,
      },
      timeout: 60000,
    });

    if (!collectionPage.success || !collectionPage.data?.linksOnPage?.length)
      break;

    const initialSize = allProductUrls.size;
    collectionPage.data.linksOnPage.forEach(
      (link) => link.includes("/products/") && allProductUrls.add(link)
    );

    if (
      (MAX_PRODUCTS_TO_SCRAPE &&
        allProductUrls.size >= MAX_PRODUCTS_TO_SCRAPE) ||
      !SCRAPE_ALL_PAGES
    ) {
      console.log(
        "- Reached testing limit or single-page mode. Stopping pagination."
      );
      break;
    }

    if (allProductUrls.size === initialSize) {
      console.log("- No *new* product links found. Ending pagination.");
      break;
    }
    page++;
    await delay(BASE_DELAY_MS);
  }

  let urlsToProcess = Array.from(allProductUrls).slice(
    0,
    MAX_PRODUCTS_TO_SCRAPE || undefined
  );

  if (urlsToProcess.length === 0) {
    console.error("❌ No product URLs found for this collection. Skipping.");
    return [];
  }
  console.log(
    `✅ Found ${urlsToProcess.length} unique product URLs to process.`
  );
  return urlsToProcess;
}

async function scrapeProductData(urls) {
  let urlsToProcess = [...urls];
  let passNumber = 1;
  const allProductsData = [];

  while (urlsToProcess.length > 0 && passNumber <= MAX_PASSES) {
    const currentDelay = BASE_DELAY_MS * passNumber;
    console.log(
      `\n--- Starting Pass ${passNumber}/${MAX_PASSES} | URLs: ${
        urlsToProcess.length
      } | Delay: ${currentDelay / 1000}s ---`
    );
    let nextPassFailedUrls = [];

    for (const [index, productUrl] of urlsToProcess.entries()) {
      console.log(
        `[Pass ${passNumber} | ${index + 1}/${
          urlsToProcess.length
        }] Processing: ${productUrl}`
      );
      try {
        const scrapeResult = await app.scrapeUrl(productUrl, {
          pageOptions: {
            waitForSelector: ".product-list",
            smartRotation: true,
            blockAds: false,
          },
          timeout: 60000,
          extractorOptions: {
            extractionSchema: productSchema,
            prompt:
              "Extract all product details. Find the product name, vendor/brand, price with currency, all available sizes, all available colors, material, and any listed measurements. Extract the text from the 'About The Brand' and 'Shipping & Returns' sections. Find the URL for the size guide image. Capture all product image URLs.",
          },
        });

        // Fix: Check for the existence of llm_extraction object and required fields
        if (
          scrapeResult.success &&
          scrapeResult.data?.llm_extraction?.product_name
        ) {
          const productData = scrapeResult.data.llm_extraction;

          allProductsData.push({
            data: productData,
            url: productUrl,
            metadata: scrapeResult.data.metadata, // Include metadata if available
          });
        } else {
          console.warn("⚠️ Extraction failed—retrying:", productUrl);
          nextPassFailedUrls.push(productUrl);
        }
      } catch (error) {
        console.error(`  - ❌ Error: ${error.message}. Adding to retry list.`);
        nextPassFailedUrls.push(productUrl);
      }
      await delay(currentDelay);
    }
    urlsToProcess = nextPassFailedUrls;
    passNumber++;
  }
  return { successful: allProductsData, failed: urlsToProcess };
}

function generateMarkdownFile(allProductsData, categoryName, outputDir) {
  console.log("\n--- Step 3: Generating combined Markdown file ---");
  console.log(`- Found ${allProductsData} products to write.`);
  const markdownContent = allProductsData
    .map((result) => {
      const product = result.data;
      console.log("this is the product", product);
      let content = `## [${(product.product_name || "Untitled Product")
        .replace(/–.*$/, "")
        .trim()}](${result.url})\n\n`;
      if (product.price) content += `**Price:** ${product.price}\n\n`;
      if (product.vendor) content += `**Brand:** ${product.vendor}\n\n`;
      if (product.available_sizes?.length > 0)
        content += `**Available Sizes:** ${product.available_sizes.join(
          ", "
        )}\n\n`;
      if (product.available_colors?.length > 0)
        content += `**Available Colors:** ${product.available_colors.join(
          ", "
        )}\n\n`;
      if (product.measurement)
        content += `**Measurement:** ${product.measurement}\n\n`;
      if (product.material) content += `**Material:** ${product.material}\n\n`;
      content += `**Image:**\n![${product.product_name}](${
        result.metadata?.ogImage || ""
      })\n\n`;
      content += `**Description:**\n${
        product.description || "No description available"
      }\n\n`;
      if (product.about_the_brand)
        content += `**About ${product.vendor || "the Brand"}:**\n${
          product.about_the_brand
        }\n\n`;
      if (product.shipping_and_returns)
        content += `**Shipping & Returns:**\n${product.shipping_and_returns}\n\n`;
      if (product.size_chart_image_url)
        content += `**Size Chart:**\n![Size Chart](${product.size_chart_image_url})\n\n`;

      content += `---`;
      return content;
    })
    .join("\n\n");

  const outputFilePath = path.join(outputDir, `${categoryName}.md`);
  fs.writeFileSync(outputFilePath, markdownContent);
  console.log(
    `✅ Successfully saved all product information to: ${outputFilePath}`
  );
}

// --- Run the Crawler ---
crawlAllCollections();
