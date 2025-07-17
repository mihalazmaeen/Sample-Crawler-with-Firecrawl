// index.js (Final Refined Version)

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

// --- Main Crawl Function ---
async function crawlWebsite() {
  const crawlUrl = "https://www.octopus.com.hk";
  console.log(`🚀 Starting full site crawl from: ${crawlUrl}`);

  try {
    const app = new FirecrawlApp({ apiKey: firecrawlApiKey });

    const crawlResult = await app.crawlUrl(
      crawlUrl,
      {
        limit: 100, // Crawl up to 10 pages
        // REFINED: Using a more robust glob pattern for path matching
        includePaths: ["consumer/", "corporate/"],
        excludePaths: ["login/", "download/", "pdf/"],

        scrapeOptions: {
          onlyMainContent: true,
        },
      },
      true
    );

    if (!crawlResult || crawlResult.length === 0) {
      console.error(
        "Crawling failed or returned no data. Check your Firecrawl dashboard for logs."
      );
      return;
    }

    const pages = crawlResult.data;
    // The big console.log was removed to clean up the output.
    console.log(
      `✅ Crawl complete! Found ${pages.length} pages. Now processing...`
    );

    for (const pageData of pages) {
      if (pageData.markdown) {
        console.log(`- Processing: `);
        try {
          await processSinglePage(pageData);
          console.log(`- ✅ Successfully processed:`);
        } catch (processError) {
          console.error(
            `- ❌ Failed to process page: ${pageData.sourceURL}. Error: ${processError.message}`
          );
        }
      }
    }

    console.log(
      "🎉 All pages have been processed and saved in the 'output' folder!"
    );
  } catch (error) {
    console.error("An error occurred during the crawl process:", error);
  }
}

async function processSinglePage(page) {
  const outputDir = "output";
  const csvDir = path.join(outputDir, "csv");
  const pdfDir = path.join(outputDir, "pdf");

  fs.mkdirSync(csvDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });

  const safeFilename = slugify(page.sourceURL);

  const data = {
    url: page.sourceURL,
    title: page.metadata.title || "No Title Found",
    content: page.markdown,
  };

  const csvPath = path.join(csvDir, `${safeFilename}.csv`);
  const csvHeader = "url,title,content\n";
  const safeContent = data.content.replace(/"/g, '""');
  const csvRow = `"${data.url}","${data.title}","${safeContent}"`;
  fs.writeFileSync(csvPath, csvHeader + csvRow);
  console.log(`  - Saved CSV to: ${csvPath}`);

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

  await new Promise((resolve) => {
    writeStream.on("finish", () => {
      console.log(`  - Saved PDF to: ${pdfPath}`);
      resolve();
    });
  });
}

function slugify(url) {
  try {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;

    return (
      pathname
        .toString()
        .toLowerCase()
        .replace(/^\//, "")
        .replace(/\//g, "-")
        .replace(".html", "")
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
crawlWebsite();
