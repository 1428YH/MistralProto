import { createServer, type Server } from "http";

let _server: Server | null = null;

export function runServer(html: string, port = 3000) {
    if (_server) {
        _server.close(() => console.log("Previous server closed"));
    }

    _server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
    });

    _server.listen(port, () => {
        console.log(`\nServer running at http://localhost:${port}\n`);
    });

    return _server;
}