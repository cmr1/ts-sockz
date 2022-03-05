import 'colors';
import { Server, Socket } from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as WebServer, IncomingMessage, ServerResponse as WebServerResponse } from 'http';
import { Base, BaseSocket } from './Base';
import { Agent } from './Agent';
import { Client } from './Client';

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

    this.web = new WebServer((req: IncomingMessage, res: WebServerResponse) => {
      res.end('Hello world!');
    });

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
    this.wss.on('connection', this.connectWeb.bind(this));
    this.agentServer.on('connection', this.connectAgent.bind(this));
    this.clientServer.on('connection', this.connectClient.bind(this));
  }

  public debug(): void {
    this.log.debug(`${this.agents.length} Agent(s) | ${this.clients.length} Client(s)`);
  }

  public connectWeb(ws: WebSocket): void {
    ws.on('message', function message(data) {
      console.log('received: %s', data);
    });

    ws.send('something');
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

  public disconnect(target: BaseSocket): void {
    // this.log.debug(`Disconnecting target: ${target.signature} [${target.id}]`);

    if (target instanceof Agent) {
      this.disconnectAgent(target);
    } else if (target instanceof Client) {
      this.disconnectClient(target);
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
}
