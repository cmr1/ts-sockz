import 'colors';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { Server, Socket } from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as WebServer, IncomingMessage, ServerResponse as WebServerResponse } from 'http';
import { Base, BaseSocket } from './Base';
import { Agent } from './Agent';
import { Client } from './Client';
import { WebClient } from './WebClient';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_AGENT_PORT = 1111;
const DEFAULT_CLIENT_PORT = 2222;
const DEFAULT_PROMPT = `😉 `;

export class Controller extends Base {
  public web: WebServer;
  public wss: WebSocketServer;
  public agentServer: Server;
  public clientServer: Server;

  public agents: Agent[] = [];
  public clients: Client[] = [];
  public webClients: WebClient[] = [];

  constructor(
    public host = DEFAULT_HOST,
    public agentPort = DEFAULT_AGENT_PORT,
    public clientPort = DEFAULT_CLIENT_PORT,
    public prompt = DEFAULT_PROMPT
  ) {
    super();
  }

  public startAgent(): void {
    const socket = new Socket();
    const agent = new Agent(this, socket);
    agent.start();
  }

  public startServer(): void {
    this.init();
    this.listen();
    this.handle();
  }

  public init(): void {
    this.log.debug('Controller#init()');

    this.web = new WebServer(this.connectWebserver.bind(this));

    this.wss = new WebSocketServer({ host: this.host, port: 8080 }, () => {
      this.log.info(`Websocket server listening: ${this.host}:8080`);
    });

    this.agentServer = new Server();
    this.clientServer = new Server();
  }

  public listen(): void {
    this.web.listen(8181, this.host, () => {
      this.log.info(`Web server listening: ${this.host}:8181`);
    });

    this.agentServer.listen(this.agentPort, this.host, () => {
      this.log.info(`Agent server listening: ${this.host}:${this.agentPort}`);
    });

    this.clientServer.listen(this.clientPort, this.host, () => {
      this.log.info(`Client server listening: ${this.host}:${this.clientPort}`);
    });
  }

  public handle(): void {
    this.wss.on('connection', this.connectWebsocket.bind(this));
    this.agentServer.on('connection', this.connectAgent.bind(this));
    this.clientServer.on('connection', this.connectClient.bind(this));
  }

  public debug(): void {
    this.log.debug(`${this.agents.length} Agent(s) | ${this.clients.length} Client(s)`);
  }

  public connectWebserver(req: IncomingMessage, res: WebServerResponse) {
    console.log(`${req.method} ${req.url}`);

    if (req.url) {
      // parse URL
      // const parsedUrl = url.parse(req.url);
      // TODO: Future support with https + certs
      const baseURL =  'http://' + req.headers.host;
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

      if(!exist) {
        // if the file is not found, return 404
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
      }

      // if is a directory search for index file matching the extension
      if (fs.statSync(pathname).isDirectory()) pathname += `index${ext}`;

      // read file from file system
      fs.readFile(pathname, function(err, data){
        if(err){
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          // if the file is found, set Content-type and send data
          res.setHeader('Content-type', map[ext] || 'text/plain' );
          res.end(data);
        }
      });
    }
  }

  public connectWebsocket(ws: WebSocket): void {
    const client = new WebClient(this, ws, this.prompt);

    this.webClients.push(client);

    this.debug();
    // ws.on('message', function message(data) {
    //   console.log('received: %s', data);
    // });

    // ws.send('something');
  }

  public connectAgent(socket: Socket): void {
    const agent = new Agent(this, socket);
    this.agents.push(agent);
    this.debug();
  }

  public connectClient(socket: Socket): void {
    const client = new Client(this, socket);
    this.clients.push(client);
    this.debug();
  }

  public disconnect(target: BaseSocket | WebClient): void {
    // this.log.debug(`Disconnecting target: ${target.signature} [${target.id}]`);

    if (target instanceof Agent) {
      this.disconnectAgent(target);
    } else if (target instanceof Client) {
      this.disconnectClient(target);
    } else if (target instanceof WebClient) {
      this.disconnectWebClient(target);
    } else {
      this.log.warn(`Invalid target type, cannot disconnect:`, target);
    }

    this.debug();
  }

  public disconnectAgent(agent: Agent): void {
    this.agents = this.agents.filter((item) => item.id !== agent.id);
  }

  public disconnectClient(client: Client): void {
    this.clients = this.clients.filter((item) => item.id !== client.id);
  }

  public disconnectWebClient(client: WebClient): void {
    this.webClients = this.webClients.filter((item) => item.id !== client.id);
  }
}
