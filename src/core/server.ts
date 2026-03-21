import { createServer, type Server } from "http";
import { loadConfig } from "../config/load.js";

let _server: Server | null = null;

export async function runServer(html: string, port?: number): Promise<Server> {
    if (_server) {
        _server.close(() => console.log("Previous server closed"));
        _server = null;
    }

    const config = await loadConfig();
    const targetPort = port ?? config.serverPort;

    _server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
    });

    return new Promise((resolve, reject) => {
        _server!.once("error", (err) => {
            console.error("Server error:", err);
            reject(err);
        });
        _server!.listen(targetPort, () => {
            _server!.on("error", (err) => console.error("Server error:", err));
            console.log(`\nServer running at http://localhost:${targetPort}\n`);
            resolve(_server!);
        });
    });
}