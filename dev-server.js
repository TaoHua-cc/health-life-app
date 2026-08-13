const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};

http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end('Forbidden');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return res.writeHead(404).end('Not found');
    res.writeHead(200, {'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
}).listen(8765, '127.0.0.1', () => console.log('Xiaoman local web: http://127.0.0.1:8765/'));
