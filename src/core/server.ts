import { createServer, type Server } from "http";
import { createInterface } from "readline";
import { loadConfig } from "../config/load.js";

const SERVER_TIMEOUT_SEC = 560;

let _server: Server | null = null;
let _html = "";

export function closeServer(): void {
    if (_server) {
        _server.close(() => {
            console.log("[Server] Stopped");
        });
        _server = null;
    }
}

export async function runServer(html: string, port?: number): Promise<Server> {
    _html = html;

    if (_server) {
        console.log("[Server] Content updated, refresh browser to see changes");
        return _server;
    }

    const config = await loadConfig();
    const targetPort = port ?? config.serverPort;

    _server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(_html);
    });

    return new Promise((resolve, reject) => {
        _server!.once("error", (err) => {
            console.error("Server error:", err);
            reject(err);
        });
        _server!.listen(targetPort, () => {
            _server!.on("error", (err) => console.error("[Server] Error:", err));
            console.log("[Server] ✓ Running at http://localhost:" + targetPort);
            console.log("[Server] Timer: " + SERVER_TIMEOUT_SEC + "s | Press 'q' + Enter to stop early");
            resolve(_server!);
        });
    });
}

export async function waitForServerStop(): Promise<void> {
    let remaining = SERVER_TIMEOUT_SEC;
    const interval = setInterval(() => {
        process.stdout.write("\r[Server] Time left: " + remaining + "s (press 'q'+Enter to stop)    ");
        remaining--;
        if (remaining < 0) {
            clearInterval(interval);
        }
    }, 1000);

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onLine = (line: string) => {
        const cmd = line.trim().toLowerCase();
        if (cmd === "q" || cmd === "quit") {
            rl.off("line", onLine);
            rl.close();
            clearInterval(interval);
            process.stdout.write("\r" + " ".repeat(55) + "\r\n");
            closeServer();
        }
    };
    rl.on("line", onLine);

    await new Promise<void>((resolve) => {
        const check = setInterval(() => {
            if (!_server) {
                clearInterval(check);
                clearInterval(interval);
                rl.off("line", onLine);
                rl.close();
                resolve();
            }
        }, 100);

        setTimeout(() => {
            if (_server) {
                clearInterval(check);
                clearInterval(interval);
                rl.off("line", onLine);
                rl.close();
                process.stdout.write("\r" + " ".repeat(55) + "\r\n");
                closeServer();
            }
            resolve();
        }, SERVER_TIMEOUT_SEC * 1000);
    });
}