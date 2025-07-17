// index.js (Sitemap Crawl - With Retry Logic)

import "dotenv/config";
import FirecrawlApp from "@mendable/firecrawl-js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// --- Configuration ---
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlApiKey) {
  console.error(
    "Error: FIRECRAWL_API_KEY is not set. Please create a .env file."
  );
  process.exit(1);
}

// --- NEW: Configuration for Retry Logic ---
const MAX_PASSES = 3; // Total attempts: 1 initial + 2 retries
const BASE_DELAY_MS = 1500; // 1.5 seconds, will increase on each pass

const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// --- Main Crawl Function ---
async function crawlSiteFromSitemap() {
  const sitemapUrl = "Your Url Here"; // Replace with your sitemap URL
  const baseUrl = "The Base URL Here"; // Replace with your base URL
  console.log(`🚀 Starting sitemap-based crawl for ${baseUrl}`);

  try {
    // --- PHASE 1: Get Initial List of URLs (No changes here) ---
    console.log(
      `\n--- Phase 1: Fetching and parsing sitemap from: ${sitemapUrl} ---`
    );
    const sitemapResult = await app.scrapeUrl(sitemapUrl, {
      onlyMainContent: true,
    });
    if (!sitemapResult || !sitemapResult.markdown) {
      console.error("Could not scrape the sitemap page. Exiting.");
      return;
    }

    const urlRegex = /\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
    const allLinks = sitemapResult.markdown.match(urlRegex) || [];
    const uniqueUrls = new Set();
    for (const link of allLinks) {
      const url = link.substring(link.indexOf("(") + 1, link.length - 1);
      if (url.startsWith(baseUrl)) {
        uniqueUrls.add(url);
      }
    }

    let urlsToProcess = Array.from(uniqueUrls);
    if (urlsToProcess.length === 0) {
      console.error("No valid internal URLs found in the sitemap. Exiting.");
      return;
    }
    console.log(
      `✅ Phase 1 Complete! Found ${urlsToProcess.length} unique URLs to process.`
    );

    // --- PHASE 2: Process URLs with Multi-Pass Retry Logic ---
    let passNumber = 1;
    let successCount = 0;
    let permanentlyFailedUrls = [];

    while (urlsToProcess.length > 0 && passNumber <= MAX_PASSES) {
      const currentDelay = BASE_DELAY_MS * passNumber;
      console.log(
        `\n--- Starting Pass ${passNumber}/${MAX_PASSES} | URLs to process: ${
          urlsToProcess.length
        } | Delay: ${currentDelay / 1000}s ---`
      );

      let nextPassFailedUrls = [];

      for (const [index, url] of urlsToProcess.entries()) {
        console.log(
          `\n[Pass ${passNumber} | ${index + 1}/${
            urlsToProcess.length
          }] Processing: ${url}`
        );
        try {
          const pageData = await app.scrapeUrl(url, { onlyMainContent: true });

          if (pageData && pageData.success && pageData.markdown) {
            await processSinglePage(pageData, url);
            successCount++;
          } else {
            console.warn(
              `- ⚠️ Scrape failed or returned no content. Adding to retry list.`
            );
            nextPassFailedUrls.push(url);
          }
        } catch (error) {
          console.error(`- ❌ Error: ${error.message}. Adding to retry list.`);
          nextPassFailedUrls.push(url);
        }
        await delay(currentDelay);
      }

      urlsToProcess = nextPassFailedUrls; // The failed URLs become the list for the next pass
      passNumber++;
    }

    // After the loop, any URLs still in urlsToProcess are permanent failures
    permanentlyFailedUrls = urlsToProcess;

    // --- Final Report ---
    console.log("\n\n🎉 All processing complete!");
    console.log(`- ✅ Successfully saved: ${successCount} pages.`);
    if (permanentlyFailedUrls.length > 0) {
      console.error(
        `- ❌ Permanently failed: ${permanentlyFailedUrls.length} pages.`
      );
      console.log(
        "The following URLs could not be scraped after all attempts:"
      );
      permanentlyFailedUrls.forEach((url) => console.log(`  - ${url}`));
    } else {
      console.log("- ✅ No failed pages after all retries!");
    }
    console.log("Check the 'output' folder for results.");
  } catch (error) {
    console.error("A critical error occurred during the process:", error);
  }
}

// --- Helper functions processSinglePage and slugify (No changes needed) ---

async function processSinglePage(page, sourceUrl) {
  const outputDir = "output";
  const csvDir = path.join(outputDir, "csv");
  const pdfDir = path.join(outputDir, "pdf");

  fs.mkdirSync(csvDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });

  const safeFilename = slugify(sourceUrl);

  const data = {
    url: sourceUrl,
    title: page.metadata.title || "No Title Found",
    content: page.markdown,
  };

  const csvPath = path.join(csvDir, `${safeFilename}.csv`);
  const csvHeader = "url,title,content\n";
  const safeContent = data.content.replace(/"/g, '""');
  const csvRow = `"${data.url}","${data.title}","${safeContent}"`;
  fs.writeFileSync(csvPath, csvHeader + csvRow);

  const pdfPath = path.join(pdfDir, `${safeFilename}.pdf`);
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  doc.fontSize(20).text(data.title, { align: "center" });
  doc.moveDown();
  doc
    .fontSize(10)
    .fillColor("blue")
    .text(`Source: ${data.url}`, { link: data.url, underline: true });
  doc.moveDown(2);
  doc.fillColor("black").fontSize(12).text(data.content, { align: "justify" });
  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
  console.log(`  - ✅ Saved CSV and PDF for: ${safeFilename}`);
}

function slugify(url) {
  if (!url) {
    console.warn(`slugify received an invalid URL. Using random string.`);
    return `invalid-url-${Math.random().toString(36).substring(7)}`;
  }
  try {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;

    return (
      pathname
        .toString()
        .toLowerCase()
        .replace(/^\//, "")
        .replace(/\//g, "-")
        .replace(/\.html$/, "")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "") || "index"
    );
  } catch (e) {
    console.warn(
      `Could not parse URL for slugify: ${url}. Using a random string.`
    );
    return `malformed-url-${Math.random().toString(36).substring(7)}`;
  }
}

// --- Run the Crawler ---
crawlSiteFromSitemap();
