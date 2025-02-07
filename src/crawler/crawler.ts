import { minimatch } from "minimatch";
import puppeteer, { Browser, Page } from "puppeteer";
import { getPageHtml, waitForXPath } from "./utils";

export type RequestHandler = (
  page: Page,
  url: string,
  push: (urls: string[]) => void
) => Promise<void>;

export interface CrawlerOptions {
  requestHandler: RequestHandler;
  maxUrlsToCrawl?: number;
  maxConcurrencies?: number;
}

/**
 * A simple web crawler
 * @example
 * const crawler = new Crawler({
 *   requestHandler: async (page, url, push) => {
 *     const title = await page.title();
 *     console.log(`Crawled: ${url}, Title: ${title}`);
 *     const links = await page.evaluate(() =>
 *       Array.from(document.querySelectorAll("a")).map((a) => a.href)
 *     );
 *     push(links);
 *   },
 *   maxUrlsToCrawl: 10,
 *   maxConcurrencies: 5,
 * });
 *
 * crawler.start(["https://example.com"]);
 */
export class Crawler {
  private browser: Browser | null = null;
  private requestHandler: (
    page: Page,
    url: string,
    push: (urls: string[]) => void
  ) => Promise<void>;
  private maxUrlsToCrawl: number;
  private maxConcurrencies: number;
  private urlQueue: string[] = [];
  private activeCrawls: number = 0;
  private crawledUrls: Set<string> = new Set();
  private isRunning: boolean = false; // Để ngăn việc đóng trình duyệt khi còn URL cần xử lý

  constructor(options: CrawlerOptions) {
    this.requestHandler = options.requestHandler;
    this.maxUrlsToCrawl = options.maxUrlsToCrawl || 10;
    this.maxConcurrencies = options.maxConcurrencies || 10;
  }

  async start(startUrls: string[]): Promise<void> {
    this.push(startUrls);
    this.browser = await puppeteer.launch();
    this.isRunning = true;
  
    return new Promise<void>((resolve) => {
      this.processQueue(resolve);
    });
  }
  
  private async processQueue(resolve: () => void) {
    while (
      this.isRunning &&
      this.activeCrawls < this.maxConcurrencies &&
      this.urlQueue.length > 0
    ) {
      const url = this.urlQueue.shift();
      if (!url) break;
  
      this.activeCrawls++;
      this.crawl(url).finally(() => {
        this.activeCrawls--;
        if (this.urlQueue.length > 0) {
          this.processQueue(resolve);
        } else if (this.activeCrawls === 0) {
          this.stop().then(resolve); // Đợi stop() hoàn thành trước khi resolve
        }
      });
    }
  }

  private async crawl(url: string) {
    if (
      !this.browser ||
      this.maxUrlsToCrawl-- <= 0 ||
      this.crawledUrls.has(url)
    )
      return;
    let page: Page | null = null;

    try {
      this.crawledUrls.add(url);
      page = await this.browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await this.requestHandler(page, url, this.push.bind(this));
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    } finally {
      if (page) await page.close();
    }
  }

  push(urls: string[]) {
    urls.forEach((url) => {
      if (!this.crawledUrls.has(url) && !this.urlQueue.includes(url)) {
        this.urlQueue.push(new URL(url).href);
      }
    });
  }

  private async stop() {
    this.isRunning = false;
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export interface CrawlOptions {
  urls: string[];
  selector?: string;
  ignoreSelector?: string;
  waitForSelectorTimeout?: number;
  match: string | string[];
  exclude?: string | string[];
  maxUrlsToCrawl?: number;
  maxConcurrencies?: number;
}

export async function crawl<T = any>(options: CrawlOptions): Promise<T[]> {
  const dataset: T[] = [];
  const crawler = new Crawler({
    requestHandler: async (page, url, push) => {
      // Wait for the selector to appear on the page
      if (options.selector) {
        if (options.selector.startsWith("/")) {
          await waitForXPath(
            page,
            options.selector,
            options.waitForSelectorTimeout ?? 1000
          );
        } else {
          await page.waitForSelector(options.selector, {
            timeout: options.waitForSelectorTimeout ?? 1000,
          });
        }
      }

      // Get all the links on the page
      const urls = await page.evaluate(() => {
        const anchorElements = Array.from(document.querySelectorAll("a"));
        return anchorElements.map((a) => {
          const href = (a as HTMLAnchorElement).href;
          return href.startsWith("/")
            ? new URL(href, window.location.origin).href
            : href;
        });
      });

      if (options.match) {
        const filteredUrls = urls.filter((link) => {
          if (Array.isArray(options.match)) {
            return options.match.some((pattern) => minimatch(link, pattern));
          } else {
            return minimatch(link, options.match);
          }
        });
        push(filteredUrls);
      } else {
        push(urls);
      }

      // Get the page title and content
      const title = await page.title();
      const content = await getPageHtml(
        page,
        options.selector,
        options.ignoreSelector
      );

      dataset.push({ url, title, content } as T);
    },
    maxUrlsToCrawl: options.maxUrlsToCrawl,
    maxConcurrencies: options.maxConcurrencies,
  });

  await crawler.start(options.urls);
  return dataset;
}
