const app = require('../server');

// Vercel Serverless Function entrypoint
module.exports = (req, res) => {
  // When Vercel rewrites routes, x-matched-path contains the original URL
  const matchedPath = req.headers['x-matched-path'];
  if (matchedPath && matchedPath !== req.url) {
    req.url = matchedPath;
  }
  return app(req, res);
};
