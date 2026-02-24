import http from 'http';
import https from 'https';

const server = http.createServer((req, res) => {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const payload = Buffer.concat(body).toString();
        console.log("=== INTERCEPTED REQUEST TO", req.url, "===");
        try {
            console.log(JSON.stringify(JSON.parse(payload), null, 2));
        } catch (e) {
            console.log(payload);
        }

        delete req.headers['accept-encoding'];

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: req.url,
            method: req.method,
            headers: { ...req.headers }
        };
        options.headers.host = 'generativelanguage.googleapis.com';

        const proxyReq = https.request(options, proxyRes => {
            console.log("=== RESPONSE STATUS:", proxyRes.statusCode, "===");
            let resBody = [];
            proxyRes.on('data', chunk => resBody.push(chunk));
            proxyRes.on('end', () => {
                const resPayload = Buffer.concat(resBody).toString();
                console.log("RESPONSE BODY:", resPayload);
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                res.end(resPayload);
            });
        });

        proxyReq.on('error', e => console.error("Proxy Error:", e));
        proxyReq.write(payload);
        proxyReq.end();
    });
});

server.listen(4000, () => console.log('Proxy listening on 4000'));
