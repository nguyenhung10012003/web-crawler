import dotenv from 'dotenv';
import http, { IncomingMessage, ServerResponse } from 'http';
import { crawl } from './crawler/crawler';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || 'localhost';

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url) {
      const url = new URL(
        `http://${HOST}${req.url}`
      );
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Pong!' }));
      } else if (req.method === 'GET' && url.pathname === '/crawl') {
        const urls = url.searchParams.get('urls');
        const match = url.searchParams.get('match');
        const maxUrlsToCrawl = url.searchParams.get('maxUrlsToCrawl');

        if (!urls || !match) {
          res.writeHead(400);
          res.end(
            JSON.stringify({ error: 'Urls and match must be appear in query' })
          );
        } else {
          const data = await crawl({
            urls: urls.split(','),
            match: match.split(','),
            maxUrlsToCrawl: maxUrlsToCrawl ? parseInt(maxUrlsToCrawl, 10) : 10,
            maxConcurrencies: 5
          });

          res.end(JSON.stringify({ data }));
        }
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }
);

server.listen(PORT, () => {
  const address = server.address();
  if (typeof address === 'string') {
    console.log(`Server is running at ${address}`);
  } else if (address) {
    console.log(
      `Server is running on http://${HOST}:${address.port}`
    );
  }
});
