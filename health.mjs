import http from 'http';

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`✅ Health check server running at http://localhost:${PORT}/healthz`);
});