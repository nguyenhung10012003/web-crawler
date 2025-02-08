# WEB CRAWLER
## Introduction

This project is a simple web crawler HTTP server built using Puppeteer and node-http. It allows you to scrape web pages and extract useful information.

## Features

- Crawl web pages
- Extract data from HTML
- Simple HTTP server interface

## Development

1. Clone the repository:
  ```sh
  git clone https://github.com/nguyenhung10012003/web-crawler.git
  ```
2. Navigate to the project directory:
  ```sh
  cd web-crawler
  ```
3. Install the dependencies:
  ```sh
  corepack enable
  corepack prepare yarn@4.6.0 --activate
  yarn install
  ```

4. Build project:
  ```sh
  yarn run build
  ```

5. Run:
  ```sh
  yarn run dev
  ```

  OR
  
  ```sh
  yarn run start
  ```

## Docker deploy

1. Build image
  ```sh
  docker build -t crawler .
  ```
2. Run container
  ```sh
  docker run -p 8080:8080 --name cralwer crawler
  ```

## License

This project is licensed under the MIT License.
