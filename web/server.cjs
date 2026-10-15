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
    // Passenger replaces the port, so the value only matters outside cPanel.
    createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
