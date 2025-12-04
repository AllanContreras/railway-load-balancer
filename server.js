
const http = require('http');
const httpProxy = require('http-proxy');

// Backends Railway
const targets = [
  'https://color-craze-production.up.railway.app',
  'https://amiable-prosperity-production.up.railway.app'
];

let current = 0; // Round-robin index
const ipMap = new Map(); // IP -> backend index

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  secure: true
});

function getClientIp(req) {
  // X-Forwarded-For puede tener múltiples IPs, tomamos la primera
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection?.socket ? req.connection.socket.remoteAddress : null)
  );
}

function getTargetForIp(ip) {
  if (ipMap.has(ip)) {
    return targets[ipMap.get(ip)];
  } else {
    // Asignar backend por round-robin
    const idx = current;
    ipMap.set(ip, idx);
    current = (current + 1) % targets.length;
    return targets[idx];
  }
}

const server = http.createServer((req, res) => {
  const ip = getClientIp(req);
  const target = getTargetForIp(ip);
  proxy.web(req, res, { target }, (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  });
});

// WebSocket upgrade handler
server.on('upgrade', (req, socket, head) => {
  const ip = getClientIp(req);
  const target = getTargetForIp(ip);
  proxy.ws(req, socket, head, { target });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Load balancer with sticky sessions listening on port ${PORT}`);
});