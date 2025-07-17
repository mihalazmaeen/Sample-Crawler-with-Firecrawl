# Firecrawl Crawler Project README 📖

## 🧐 General Information

This repository contains the Firecrawl Crawler project. The project's main focus is to provide a tool to crawl a specified website or sitemap for content, extract it, and create structured CSV and PDF documents for each crawled page. It leverages the `@mendable/firecrawl-js` library to facilitate the crawling process and makes use of environment variables to store the API key.

## 🎯 Goals

The main goals of the Firecrawl Crawler project are:

- **Crawl efficiently**: It should follow a sitemap or crawl a website to find all relevant pages.
- **Retry Logic**: Implement retry logic to ensure the maximum number of pages are successfully scraped.
- **Data extraction**: Collect essential details from each page, such as URLs, titles, and main content, and save them in a standard format.
- **Output generation**: Create CSV and PDF files for each page and save them in categorized 'output' folders.
- **Refinable iterations**: Allow for specific configurations to refine the crawling process, exclude paths, or include certain URL patterns.

## ⌨️ Commands

The project is built with Node.js and can be executed with the following commands:

- `node index.js`: Run the main crawler script for sitemap crawling with retry logic.
- `node index._js`: Run the refined version of the crawler script.

## 🚀 Usage

1. Install Node.js on your machine if you haven't already.
2. Clone the repository to your local machine.
3. Navigate into the project directory.
4. Install dependencies with `npm install`.
5. Create a `.env` file at the root of the project and set the `FIRECRAWL_API_KEY` with your API key value.
6. Execute the crawler script using `node index.js` or `node index._js`.

Please note that the `.env` file, which contains the API key, is critical to run the project but it should **never** be committed to a public repository for security reasons.

## 🛠 Project structure

```
.
├── .env                  # Environment file to store FIRECRAWL_API_KEY
├── index.js              # Main crawler script with retry logic and URL processing
├── index._js             # Refined version of the main crawler script
├── package.json          # Node project manifest file with dependencies and metadata
└── output                # Directory will be generated during the crawling process
    ├── csv               # CSV files for each page will be created here
    └── pdf               # PDF files for each page will be created here

1 directory, 5 files
```

### Detailed file and directory descriptions

- `.env`: Holds the FIRECRAWL_API_KEY necessary for authenticating API requests with Firecrawl.
- `index.js`: Initial script containing the functionality to crawl a sitemap, retry failed attempts, and save results into CSV and PDF formats.
- `index._js`: Final refined version of the crawler that provides enhanced path matching and optimization of the crawling process.
- `package.json`: Includes project metadata, scripts, and dependencies such as `@mendable/firecrawl-js`, `dotenv`, and `pdfkit`.

The `output` folder, along with its subdirectories `csv` and `pdf`, will be dynamically created when running the scripts and are not part of the static project structure.

## 📝 Note

This README was created with the heart by Lyo and Lemos in a creative way. Happy crawling! 🕷️💖