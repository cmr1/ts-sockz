import 'colors';
import fs from 'fs';
import tls, { TLSSocket } from 'tls';
import path from 'path';
import shell from 'shelljs';
import { Socket } from 'net';
import { ISockzAgent } from './contracts';
import { SockzController } from './SockzController';
import { SockzRelay } from './SockzRelay';

const rick = 'https://www.youtube.com/watch?v=oHg5SJYRHA0';

export class SockzAgent extends SockzRelay implements ISockzAgent {
  public listener?: boolean;

  constructor(public ctl: SockzController, public socket: TLSSocket) {
    super(ctl, socket);
  }

  public init(): void {
    super.init();

    this.on('registered', () => {
      this.ctl.clients.forEach(this.notify.bind(this));
      this.ctl.webClients.forEach(this.notify.bind(this));

    });

    // this.log.info(this.socket);

    const cert = this.socket.getPeerCertificate();

    this.log.info(`Cert info`, cert);

    if (this.socket.authorized) {
      this.log.success(`Authorized`);
      this.write(`reg ${this.signature}`);
    } else {
      this.log.error(`Unauthorized: ${this.socket.authorizationError}`);
    }
  }

  public notify(client: SockzRelay): void {
    if (!client.relay) {
      client.ls(`\n** New SockzAgent Connected! **`.bgGreen);
    }
  }

  public data(data: any): void {
    if (this.listener) {
      this.log.debug(`Handling data as listener: ${data}`);
      this.handle(data.toString().trim());
    } else {
      super.data(data);
    }
  }

  public handle(action: string): void {
    let response = '';

    this.log.debug(`Handle action: ${action}`);

    if (action === this.ctl.prompt.trim()) {
      this.log.warn(`Ignoring request to exec prompt: ${action}`);
    } else if (action === 'ping') {
      response = 'pong';
    } else if (action === 'stop') {
      this.socket.end();
      return;
    } else if (/rickroll/i.test(action)) {
      shell.exec(`python3 -m webbrowser "${rick}"`);
      response = `Rick is rolling ...`;
    } else if (action === 'info') {
      response = JSON.stringify(this.systemInfo, null, 2);
    } else {
      const res = shell.exec(action, { silent: true });
      const [cmd, ...args] = action.split(' ').map(str => str.trim());

      if (res?.code === 0 && cmd === 'cd' && args.length) {
        const [dest] = args;
        const target = /^\./.test(dest) ? path.join(process.cwd(), dest) : dest;

        if (fs.existsSync(target)) {
          process.chdir(target);
          response = `chdir ${process.cwd()}`;

          this.log.warn(`Changed working directory: ${process.cwd()}`);
        } else {
          response = `${action} [FAIL] (target ${target} does not exist)`;
        }
      } else {
        if (res && res.stdout) {
          response = res.stdout;
        }

        if (res && res.stderr) {
          response += res.stderr;
        }

        response += `\n${action}`;

        if (res && res.code === 0) {
          response += ` [OK]`.green;
        } else {
          response += ` [FAIL] (code: ${res ? res.code : 'No Response'})`.red;
        }
      }
    }

    this.write(response);
  }

  public start(): void {
    this.listener = true;
    this.log.info(`Starting SockzAgent...`);

    this.signature = `${this.systemInfo?.user.username}@${this.systemInfo?.os.hostname}`;

    this.socket = tls.connect({ ...this.ctl.tlsOptions('client', 'bob'), host: this.ctl.host, port: this.ctl.agentPort }, () => {
      this.log.info(`SockzAgent connected to controller: ${this.ctl.host}:${this.ctl.agentPort}`);

      const cert = this.socket.getPeerCertificate();

      this.log.info(`Cert info`, cert);

      if (this.socket.authorized) {
        this.log.success(`Authorized`);
        this.write(`reg ${this.signature}`);
      } else {
        this.log.error(`Unauthorized: ${this.socket.authorizationError}`);
      }
    });

    // const conn = this.socket.connect({ ...this.ctl.tlsOptions('client', 'alice'), port: this.ctl.agentPort, host: this.ctl.host }, () => {
    //   this.log.info(`SockzAgent connected to controller: ${this.ctl.host}:${this.ctl.agentPort}`);

    //   this.write(`reg ${this.signature}`);
    // });

    // console.log(conn);
  }
}
