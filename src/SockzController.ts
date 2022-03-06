import 'colors';
import fs from 'fs';
import path from 'path';
import { Server, Socket } from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as WebServer, IncomingMessage, ServerResponse as WebServerResponse } from 'http';
import { SockzBase, SockzRelay } from './SockzBase';
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

  public startAgent(): void {
    const socket = new Socket();
    const agent = new SockzAgent(this, socket);
    agent.start();
  }

  public startServer(): void {
    this.init();
    this.listen();
    this.handle();
  }

  public init(): void {
    this.log.debug('SockzController#init()');

    this.web = new WebServer(this.connectWebserver.bind(this));

    this.wss = new WebSocketServer({ host: this.host, port: this.wssPort }, () => {
      this.log.info(`Websocket server listening: ${this.host}:${this.wssPort}`);
    });

    this.agentServer = new Server();
    this.clientServer = new Server();
  }

  public listen(): void {
    this.web.listen(this.webPort, this.host, () => {
      this.log.info(`Web server listening: ${this.host}:${this.webPort}`);
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
    this.agentServer.on('connection', this.connectAgent.bind(this));
    this.clientServer.on('connection', this.connectClient.bind(this));
  }

  public debug(): void {
    this.log.debug(`${this.agents.length} SockzAgent(s) | ${this.clients.length} SockzClient(s)`);
  }

  public connectWebserver(req: IncomingMessage, res: WebServerResponse) {
    console.log(`${req.method} ${req.url}`);

    const replacements = ['host', 'webPort', 'wssPort'];

    if (req.url) {
      // parse URL
      // const parsedUrl = url.parse(req.url);
      // TODO: Future support with https + certs
      const baseURL = 'http://' + req.headers.host;
      const parsedUrl = new URL(req.url, baseURL);
      // extract URL path
      let pathname = path.join(__dirname, 'public', parsedUrl.pathname);
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

          replacements.forEach(key => {
            content = content.replace(`{{${key}}}`, this[key]);
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

    this.webClients.push(client);

    this.debug();
    // ws.on('message', function message(data) {
    //   console.log('received: %s', data);
    // });

    // ws.send('something');
  }

  public connectAgent(socket: Socket): void {
    const agent = new SockzAgent(this, socket);
    this.agents.push(agent);
    this.debug();
  }

  public connectClient(socket: Socket): void {
    const client = new SockzClient(this, socket);
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
