import { createServer } from "http";

export function runServer(html: string, port = 3000) {
    const server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
    });
    server.listen(port, () => {
        console.log(`\nServer running at http://localhost:${port}\n`);
    });
    return server;
}
