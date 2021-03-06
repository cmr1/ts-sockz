import 'colors';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { Socket } from 'net';
import { Server, TLSSocket, TLSSocketOptions } from 'tls';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, ServerResponse as WebServerResponse } from 'http';
import { Server as WebServer } from 'https';
import { Firestore } from '@google-cloud/firestore';
import { SockzBase } from './SockzBase';
import { SockzRelay } from './SockzRelay';
import { SockzAgent } from './SockzAgent';
import { SockzClient } from './SockzClient';
import { SockzWebApp } from './SockzWebApp';
import { SockzWebClient } from './SockzWebClient';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WEB_PORT = 4040;
const DEFAULT_AGENT_PORT = 1111;
const DEFAULT_CLIENT_PORT = 2222;
const DEFAULT_PROMPT = `sockz> `;

const {
  SERVER_HOST_NAME = 'localhost',
  SERVER_CERT_NAME = 'server.certificate.pem',
  SERVER_KEY_NAME = 'server.clientKey.pem',
  SERVER_CA_NAME = 'server.certificate.pem',
  STRIPE_SECRET_KEY
} = process.env;

export class SockzController extends SockzBase {
  public app: SockzWebApp;
  public web: WebServer;
  public wss: WebSocketServer;
  public agentServer: Server;
  public clientServer: Server;

  public agents: SockzAgent[] = [];
  public clients: SockzClient[] = [];
  public webClients: SockzWebClient[] = [];

  public stripe: Stripe;
  public database: Firestore;

  constructor(
    public host = DEFAULT_HOST,
    public agentPort = DEFAULT_AGENT_PORT,
    public clientPort = DEFAULT_CLIENT_PORT,
    public webPort = DEFAULT_WEB_PORT,
    public prompt = DEFAULT_PROMPT
  ) {
    super();

    if (STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2020-08-27'
      });
    } else {
      throw new Error('Missing required env var for stripe: STRIPE_SECRET_KEY');
    }

    const fbConfig = path.join(__dirname, '..', 'tmp', 'sockz-test.json');

    if (fs.existsSync(fbConfig)) {
      this.database = new Firestore({
        projectId: 'sockz-test',
        keyFilename: fbConfig
      });
    }

    this.app = new SockzWebApp(this);
  }

  get docPath(): string {
    return `controllers/${this.id}`;
  }

  get docData(): object {
    return {
      id: this.id,
      host: this.host,
      prompt: this.prompt,
      agents: this.agents.map((ag) => ag.id),
      clients: this.clients.map((cl) => cl.id),
      webClients: this.webClients.map((wc) => wc.id),
      webPort: this.webPort,
      agentPort: this.agentPort,
      clientPort: this.clientPort,
      systemInfo: this.systemInfo
    };
  }

  public async save() {
    await this.database.doc(this.docPath).set(this.docData);
  }

  public tlsOptions(cert: string, key: string, caList?: string, rejectUnauthorized = false): TLSSocketOptions {
    const certsDir = path.join(__dirname, '..', 'certs');

    return {
      key: fs.readFileSync(path.join(certsDir, key)),
      cert: fs.readFileSync(path.join(certsDir, cert)),
      ca: caList ? caList.split(',').map((ca) => fs.readFileSync(path.join(certsDir, ca.trim()))) : [],
      requestCert: true,
      rejectUnauthorized
    };
  }

  public startAgent(): void {
    const socket = new Socket();
    const agent = new SockzAgent(this, new TLSSocket(socket));
    agent.start();
  }

  public startClient(quiet?: boolean): SockzClient {
    const socket = new Socket();
    const client = new SockzClient(this, new TLSSocket(socket), quiet);
    client.start();
    return client;
  }

  public startServer(): void {
    this.init();
    this.listen();
    this.handle();
  }

  public init(): void {
    this.log.debug('SockzController#init()');

    this.web = new WebServer(
      this.tlsOptions(SERVER_CERT_NAME, SERVER_KEY_NAME, SERVER_CA_NAME),
      this.app.server
      // this.connectWebserver.bind(this)
    );
    this.wss = new WebSocketServer({ server: this.web });
    this.agentServer = new Server(this.tlsOptions(SERVER_CERT_NAME, SERVER_KEY_NAME, SERVER_CA_NAME));
    this.clientServer = new Server(this.tlsOptions(SERVER_CERT_NAME, SERVER_KEY_NAME, SERVER_CA_NAME));

    this.save();
  }

  public listen(): void {
    this.web.listen(this.webPort, this.host, () => {
      this.log.info(`Web server listening: ${this.host}:${this.webPort}`);
      this.log.info(`Websocket server listening: ${this.host}:${this.webPort}`);
    });

    this.agentServer.listen(this.agentPort, this.host, () => {
      this.log.info(`SockzAgent server listening: ${this.host}:${this.agentPort}`);
    });

    this.clientServer.listen(this.clientPort, this.host, () => {
      this.log.info(`SockzClient server listening: ${this.host}:${this.clientPort}`);
    });
  }

  public handle(): void {
    this.wss.on('connection', this.connectWebsocket.bind(this));
    this.agentServer.on('secureConnection', this.connectAgent.bind(this));
    this.clientServer.on('secureConnection', this.connectClient.bind(this));
  }

  public debug(): void {
    this.log.debug(`${this.agents.length} SockzAgent(s) | ${this.clients.length} SockzClient(s)`);
  }

  public connectWebserver(req: IncomingMessage, res: WebServerResponse) {
    this.log.info(`${req.method} ${req.url}`);

    const { clientPort, agentPort, webPort } = this;

    const replacements = {
      host: SERVER_HOST_NAME,
      clientPort,
      agentPort,
      webPort
    };

    if (req.url) {
      if (req.method === 'GET' && req.url === '/health') {
        this.log.debug(`Responding to health check - request headers:`, req.headers);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('true');
        return;
      }

      if (req.method === 'POST' && req.url === '/test') {
        let payload = '';

        req.on('data', (data) => (payload += data));

        req.on('end', () => {
          this.log.info(req.headers['cookie']);

          const data = JSON.parse(payload);

          if (data && data.cmd === 'secret') {
            res.setHeader('set-cookie', 'auth=true');
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data }));
        });

        return;
      }

      const baseURL = 'http://' + req.headers.host;
      const parsedUrl = new URL(req.url, baseURL);
      // extract URL path
      let pathname = path.join(__dirname, '..', 'public', parsedUrl.pathname);
      // based on the URL path, extract the file extension. e.g. .js, .doc, ...
      const ext = path.parse(pathname).ext || '.html';
      // maps file extension to MIME typere
      const map = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword'
      };

      const exist = fs.existsSync(pathname);

      if (!exist) {
        // if the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      }

      // if is a directory search for index file matching the extension
      if (fs.statSync(pathname).isDirectory()) pathname += `index${ext}`;

      // read file from file system
      fs.readFile(pathname, (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          let content = data.toString();

          Object.keys(replacements).forEach((key) => {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key]);
          });

          // if the file is found, set Content-type and send data
          res.setHeader('Content-type', map[ext] || 'text/plain');
          res.end(content);
        }
      });
    }
  }

  public connectWebsocket(ws: WebSocket): void {
    const client = new SockzWebClient(this, ws);
    // client.init();
    this.webClients.push(client);
    this.save();
    this.debug();
    // ws.on('message', function message(data) {
    //   console.log('received: %s', data);
    // });

    // ws.send('something');
  }

  public connectAgent(socket: TLSSocket): void {
    const agent = new SockzAgent(this, socket);
    agent.init();
    this.agents.push(agent);
    this.save();
    this.debug();
  }

  public connectClient(socket: TLSSocket): void {
    const client = new SockzClient(this, socket);
    client.init();
    this.clients.push(client);
    this.save();
    this.debug();
  }

  public disconnect(target: SockzRelay | SockzWebClient): void {
    // this.log.debug(`Disconnecting target: ${target.signature} [${target.id}]`);

    if (target instanceof SockzAgent) {
      this.disconnectAgent(target);
    } else if (target instanceof SockzClient) {
      this.disconnectClient(target);
    } else if (target instanceof SockzWebClient) {
      this.disconnectWebClient(target);
    } else {
      this.log.warn(`Invalid target type, cannot disconnect:`, target);
    }

    this.save();
    this.debug();
  }

  public disconnectAgent(agent: SockzAgent): void {
    this.agents = this.agents.filter((item) => item.id !== agent.id);
  }

  public disconnectClient(client: SockzClient): void {
    this.clients = this.clients.filter((item) => item.id !== client.id);
  }

  public disconnectWebClient(client: SockzWebClient): void {
    this.webClients = this.webClients.filter((item) => item.id !== client.id);
  }
}
