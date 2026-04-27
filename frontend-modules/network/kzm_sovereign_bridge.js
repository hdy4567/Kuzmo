const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * 🛰️ KZM Sovereign Bridge (v1.0)
 * ========================================================
 * Role: Local File System Bridge for Web-to-Disk persistence.
 * Logic: Atomic writes (Tmp-Swap) for transactional integrity.
 */

const PORT = 3888;
const DATA_DIR = path.join(__dirname, 'sovereign_storage');

// Create storage if not exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
    // 🛡️ CORS Pre-flight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const type = url.searchParams.get('type') || 'config'; // 'config', 'packets', 'painter'
    const targetFile = path.join(DATA_DIR, `${type}.json`);

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                // 🚀 [ATOMIC-TRANSACTION-COMMIT]
                const tmpPath = targetFile + '.tmp';
                fs.writeFileSync(tmpPath, body);
                fs.renameSync(tmpPath, targetFile);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'SUCCESS', message: `${type} synced to disk.` }));
                console.log(`✅ [BRIDGE] ${type}.json updated.`);
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'ERROR', message: err.message }));
            }
        });
    } else if (req.method === 'GET') {
        if (fs.existsSync(targetFile)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(fs.readFileSync(targetFile));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ status: 'EMPTY' }));
        }
    }
});

server.listen(PORT, () => {
    console.log(`
    🚀 KZM SOVEREIGN BRIDGE ONLINE
    ======================================
    [URL]  http://localhost:${PORT}
    [PATH] ${DATA_DIR}
    [MODE] Transactional JSON Sync
    ======================================
    `);
});
