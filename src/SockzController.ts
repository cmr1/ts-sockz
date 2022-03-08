import 'colors';
import fs from 'fs';
import path from 'path';
import { Socket } from 'net';
import { Server, TLSSocket, TLSSocketOptions } from 'tls';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, ServerResponse as WebServerResponse } from 'http';
import { Server as WebServer } from 'https';
import { SockzBase } from './SockzBase';
import { SockzRelay } from './SockzRelay';
import { SockzAgent } from './SockzAgent';
import { SockzClient } from './SockzClient';
import { SockzWebClient } from './SockzWebClient';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WEB_PORT = 8080;
const DEFAULT_WSS_PORT = 8181;
const DEFAULT_AGENT_PORT = 1111;
const DEFAULT_CLIENT_PORT = 2222;
const DEFAULT_PROMPT = `sockz> `;

export class SockzController extends SockzBase {
  public web: WebServer;
  public wss: WebSocketServer;
  public agentServer: Server;
  public clientServer: Server;

  public agents: SockzAgent[] = [];
  public clients: SockzClient[] = [];
  public webClients: SockzWebClient[] = [];

  constructor(
    public host = DEFAULT_HOST,
    public agentPort = DEFAULT_AGENT_PORT,
    public clientPort = DEFAULT_CLIENT_PORT,
    public webPort = DEFAULT_WEB_PORT,
    public wssPort = DEFAULT_WSS_PORT,
    public prompt = DEFAULT_PROMPT
  ) {
    super();
  }

  public tlsOptions(name): TLSSocketOptions {
    const certsDir = path.join(__dirname, '..', 'certs');

    /**
     * TODO: Certs from: server, agent+(any), client+(signed)
     * - serverKey
     * - serverCert
     * - clientKey?
     * - clientCert?
     * - agentKey?
     * - agentCert?
     * - reject?
     */
    return {
      key: fs.readFileSync(path.join(certsDir, `${name}_key.pem`)),
      cert: fs.readFileSync(path.join(certsDir, `${name}_cert.pem`)),
      ca: [fs.readFileSync(path.join(certsDir, `server_cert.pem`))],
      requestCert: true,
      rejectUnauthorized: false
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

    this.web = new WebServer(this.tlsOptions('server'), this.connectWebserver.bind(this));
    this.wss = new WebSocketServer({ server: this.web });
    this.agentServer = new Server(this.tlsOptions('server'));
    this.clientServer = new Server(this.tlsOptions('server'));
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

    const { host, clientPort, agentPort, webPort, wssPort } = this;

    const replacements = {
      // TODO: Bind host VS external host? i.e. BIND=0.0.0.0 | HOST=localhost
      host: host === '0.0.0.0' ? 'localhost' : 'host',
      clientPort,
      agentPort,
      webPort,
      wssPort
    };

    if (req.url) {
      // parse URL
      // const parsedUrl = url.parse(req.url);
      // TODO: Future support with https + certs

      if (req.method === 'POST' && req.url === '/test') {
        let payload = '';

        req.on('data', (data) => payload += data);

        req.on('end', () => {
          this.log.info(req.headers['cookie']);

          const data = JSON.parse(payload);

          if (data && data.cmd === 'secret') {
            res.setHeader('set-cookie', 'auth=true');
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data }));
        })

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
    this.debug();
  }

  public connectClient(socket: TLSSocket): void {
    const client = new SockzClient(this, socket);
    client.init();
    this.clients.push(client);
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
