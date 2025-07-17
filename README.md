Sitemap Crawler with Retry Logic

This Node.js script provides a robust method for crawling a website by first parsing a sitemap page, and then systematically scraping each discovered URL. It is built to be resilient, featuring a multi-pass retry mechanism with increasing delays to handle temporary network issues or rate-limiting.

The content of each successfully scraped page is saved in two formats: a structured .csv file and a human-readable .pdf document.

Key Features

Sitemap-Based Crawling: Instead of a blind crawl, it starts from a sitemap page to get a curated list of important URLs.

Robust Retry Logic: If a page scrape fails, the script will automatically retry up to a configurable number of times (MAX_PASSES), with an increasing delay between each attempt to improve the chances of success.

Dual-Format Output: Saves scraped content as both:

CSV: For easy data processing and analysis.

PDF: For easy reading, sharing, and archiving.

Clean Filenames: Generates SEO-friendly "slugs" from URLs to use as filenames.

Secure API Key Handling: Uses a .env file to keep your Firecrawl API key secure and out of version control.

Detailed Console Logging: Provides clear, real-time feedback on the crawling process, including which pass is running, which URL is being processed, and a final report of successes and failures.

How It Works

The script operates in a few distinct phases:

Phase 1: Sitemap Fetch & URL Extraction

It first scrapes the provided sitemap URL (sitemapUrl).

It then parses the returned Markdown content to extract all hyperlinks.

It filters these links to keep only the ones that belong to the target domain (baseUrl).

Phase 2: Multi-Pass Crawling with Retries

The script enters a loop that will run for a maximum of MAX_PASSES (e.g., 3 passes).

On each pass:

It attempts to scrape every URL remaining in its "to-do" list.

A delay is enforced between each request to be respectful to the target server. This delay increases with each subsequent pass.

If a scrape is successful, the content is processed and saved, and the URL is removed from the list.

If a scrape fails (due to a network error, timeout, or empty response), the URL is added to a temporary "failed" list.

At the end of a pass, the list of failed URLs becomes the new "to-do" list for the next pass.

Final Report

After all passes are complete, the script prints a summary report detailing the number of successfully saved pages and listing any URLs that permanently failed after all retry attempts.

Prerequisites

Node.js (v18.x or later recommended)

A Firecrawl API Key. Firecrawl offers a generous free tier to get started.

Setup and Installation

Clone the repository:


git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name


Install the dependencies:


npm install


Create the environment file:
Create a new file named .env in the root of the project directory.

Configuration: The .env File

This project uses the dotenv package to manage environment variables. This is the standard way to handle sensitive information like API keys without committing them to your repository.

Inside your newly created .env file, add the following line:


FIRECRAWL_API_KEY="YOUR_API_KEY_HERE"


Replace YOUR_API_KEY_HERE with your actual Firecrawl API key. The .gitignore file in this repository should already be configured to ignore .env files, ensuring your key remains private.

Running the Script

Once you have set up your .env file, you can run the crawler with the following command:


node index.js


You will see detailed output in your terminal as the script fetches the sitemap, processes each URL, and saves the files.

Output

After the script finishes, you will find a new output directory with the following structure:

output/
├── csv/
│   ├── tc-home-sitemap-index.csv
│   ├── tc-about-octopus-corporate-profile.csv
│   └── ... and other csv files
└── pdf/
    ├── tc-home-sitemap-index.pdf
    ├── tc-about-octopus-corporate-profile.pdf
    └── ... and other pdf files


The csv/ folder contains one .csv file per scraped page.

The pdf/ folder contains one .pdf file per scraped page.

Customization

You can easily adapt the script for your own needs by modifying the configuration variables at the top of index.js:

Generated javascript
// --- Configuration ---
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
// ...

// --- NEW: Configuration for Retry Logic ---
const MAX_PASSES = 3; // Total attempts: 1 initial + 2 retries
const BASE_DELAY_MS = 1500; // 1.5 seconds, will increase on each pass

// ...

// --- Main Crawl Function ---
async function crawlSiteFromSitemap() {
  const sitemapUrl = "https://www.example.com/sitemap"; // CHANGE THIS
  const baseUrl = "https://www.example.com";             // CHANGE THIS
  //...
}


sitemapUrl: The URL of the sitemap page you want to crawl.

baseUrl: The root domain of your target website, used to filter out external links.

MAX_PASSES: The total number of times the script will attempt to scrape a failing URL.

BASE_DELAY_MS: The initial delay (in milliseconds) between scrape requests. This delay is multiplied by the pass number on subsequent retries.
