import { Client, ConnectConfig } from "ssh2";
import net, { AddressInfo } from "node:net";

let sshClient: Client | null = null;
let localServer: net.Server | null = null;
let localPort: number | null = null;
let readyPromise: Promise<number> | null = null;

function connectConfig(): ConnectConfig {
  const base: ConnectConfig = {
    host: process.env.SSH_HOST!,
    port: Number(process.env.SSH_PORT || 22),
    username: process.env.SSH_USERNAME!,
    readyTimeout: 20_000,
  };
  if (process.env.SSH_PRIVATE_KEY) {
    base.privateKey = process.env.SSH_PRIVATE_KEY.replace(/\\n/g, "\n");
  } else if (process.env.SSH_PASSWORD) {
    base.password = process.env.SSH_PASSWORD;
  } else {
    throw new Error("Provide SSH_PASSWORD or SSH_PRIVATE_KEY");
  }
  return base;
}

export async function ensureSshTunnel(): Promise<number> {
  if (localPort && sshClient) return localPort;
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<number>((resolve, reject) => {
    const conn = new Client();
    sshClient = conn;

    conn
      .on("ready", () => {
        const server = net.createServer((socket) => {
          conn.forwardOut(
            socket.remoteAddress || "127.0.0.1",
            socket.remotePort || 0,
            process.env.DB_HOST || "127.0.0.1",
            Number(process.env.DB_PORT || 5432),
            (err, stream) => {
              if (err) {
                socket.destroy();
                return;
              }
              socket.pipe(stream);
              stream.pipe(socket);
            }
          );
        });

        server.once("listening", () => {
          localServer = server;
          const addr = server.address() as AddressInfo;
          localPort = addr.port;
          resolve(localPort);
        });

        server.on("error", (err) => reject(err));
        server.listen(0, "127.0.0.1");
      })
      .on("error", (err) => reject(err))
      .connect(connectConfig());
  });

  const cleanup = () => {
    try {
      localServer?.close();
    } catch {}
    try {
      sshClient?.end();
    } catch {}
    localServer = null;
    sshClient = null;
    localPort = null;
    readyPromise = null;
  };
  if (!process.env.__SSH_CLEANUP_ATTACHED) {
    process.env.__SSH_CLEANUP_ATTACHED = "1";
    process.on("exit", cleanup);
    process.on("SIGINT", () => {
      cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      cleanup();
      process.exit(0);
    });
  }

  return readyPromise;
}
