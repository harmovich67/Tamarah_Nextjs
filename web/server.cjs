/**
 * Startup file for cPanel "Setup Node.js App" (Passenger). Serves the production build made by `next build`.
 * Locally you do not need it: use `npm run dev:web` / `npm start -w web`.
 */
const { createServer } = require('node:http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const port = process.env.PORT || 0;
    const server = createServer((req, res) => handle(req, res));
    server.listen(port, () => {
      const addr = server.address();
      const bound = typeof addr === 'object' && addr ? addr.port : port;
      console.log(`> Storefront server ready on port ${bound}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
