const http = require('http');

const messages = [];

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && req.url === '/messages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: messages.length, messages }));
    return;
  }

  if (req.method === 'POST' && req.url.includes('/sendMessage')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      messages.push(JSON.parse(body));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: { message_id: messages.length } }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, description: 'Not found' }));
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock Telegram API listening on :${port}`);
});
