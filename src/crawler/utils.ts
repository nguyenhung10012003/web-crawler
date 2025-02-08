import { Page } from "puppeteer";

/**
 * Wait for an element to appear in the page
 * @param page - The Playwright page object
 * @param xpath - The XPath of the element to wait for
 * @param timeout - The timeout in milliseconds
 * @example
 * await waitForXPath(page, "//div[@class='content']", 5000);
 */
export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    ({ xpath, timeout }) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null
      );
      return elements.iterateNext() !== null;
    },
    {},
    { xpath, timeout }
  );
}

const defaultSelector = "body";
const defaultIgnoreSelector = `script, style, nav, .hidden, .hide, [class*="menu"], .navbar, .nav, .sidebar, .aside, .modal, [class*="sidebar"]`;

/**
 * Get the inner text of an element by CSS selector or XPath
 * @param page - The Playwright page object
 * @param selector - The CSS selector or XPath
 * @param ignoreSelector - The CSS selector to ignore
 * @returns - The inner text of the element
 * @example
 * const content = await getPageHtml(page, "body", ".ignore");
 * console.log(content);
 * @example
 * const content = await getPageHtml(page, "//div[@class='content']", ".ignore");
 * console.log(content);
 */
export function getPageHtml(
  page: Page,
  selector = defaultSelector,
  ignoreSelector = defaultIgnoreSelector
) {
  return page.evaluate(
    ({ selector, ignoreSelector }) => {
      // Check if the selector is an XPath
      if (selector.startsWith("/")) {
        const elements = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ANY_TYPE,
          null
        );
        let result = elements.iterateNext();
        if (result && result instanceof HTMLElement && ignoreSelector) {
          const ignoredElements = result.querySelectorAll(ignoreSelector);
          ignoredElements.forEach((el) => el.remove());
          return result.textContent || "";
        }
        return "";
      } else {
        // Handle as a CSS selector
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el && ignoreSelector) {
          const ignoredElements = el.querySelectorAll(ignoreSelector);
          ignoredElements.forEach((el) => el.remove());
          return el.innerText || "";
        }
        return "";
      }
    },
    { selector, ignoreSelector }
  );
}


/**
 * Get the URLs of files with a specific extension
 * @param page - The Playwright page object
 * @param extensionMatch - The regex pattern to match the file extension
 * @param baseUrl - The base URL to resolve relative URLs
 * @returns - The URLs of the files
 * @example
 * const urls = await getFileUrls(page, "pdf", "https://example.com");
 * console.log(urls);
 */
export function getFileUrls(
  page: Page,
  extensionMatch: string,
  baseUrl: string
) {
  return page.evaluate(
    ({ extensionMatch, baseUrl }) => {
      const elements = document.querySelectorAll("a[href]");
      const regex = new RegExp(extensionMatch);
      const filteredElements = Array.from(elements).filter((el) =>
        regex.test(el.getAttribute("href") || "")
      );
      const urls: string[] = [];
      filteredElements.forEach((el) => {
        const url = el.getAttribute("href");
        if (url) {
          urls.push(new URL(url, baseUrl).href);
        }
      });
      return urls;
    },
    { extensionMatch, baseUrl }
  );
}
