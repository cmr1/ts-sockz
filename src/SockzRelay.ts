import 'colors';
import Convert from 'ansi-to-html';
import { Socket } from 'net';
import { TLSSocket, PeerCertificate } from 'tls';
import { WebSocket } from 'ws';
import { ISockzConnectable } from './contracts';
import { SockzBase } from './SockzBase';
import { SockzController } from './SockzController';

export class SockzRelay extends SockzBase implements ISockzConnectable {
  public signature: string;
  public commands: string[] = ['reg', 'whoami', 'exit', 'ping', 'info', 'help'];
  public forwards: string[] = ['data', 'close', 'error'];
  public methods: string[] = ['data', 'close', 'error', 'authorized', 'unauthorized'];
  public convert: Convert;
  public client: ISockzConnectable;
  public relay?: ISockzConnectable;
  public disconnecting = false;
  public requireAuthorized = false;
  public clientAuthorized = false;

  constructor(public ctl: SockzController, public socket: TLSSocket | WebSocket, public prompt?: string) {
    super();

    this.signature = this.id;
    this.client = this;
    this.convert = new Convert();
  }

  get docPath(): string {
    return `relays/${this.id}`;
  }

  get docData(): object {
    return {
      id: this.id,
      signature: this.signature,
      commands: this.commands,
      forwards: this.forwards,
      methods: this.methods,
      disconnecting: this.disconnecting,
      requireAuthorized: this.requireAuthorized,
      clientAuthorized: this.clientAuthorized,
      systemInfo: this.systemInfo
    };
  }

  public async save() {
    await this.ctl.database.doc(this.docPath).set(this.docData);
  }

  public get cert(): PeerCertificate | undefined {
    return this.socket instanceof TLSSocket ? this.socket.getPeerCertificate() : undefined;
  }

  public get isAuthorized(): boolean {
    if (this.socket instanceof TLSSocket) {
      return !this.requireAuthorized || this.socket.authorized;
    } else if (this.socket instanceof WebSocket) {
      return this.clientAuthorized;
    }

    return false;
  }

  public authorized(): void {
    const msg = `Authorized: ${this.cert?.subject.CN}`;

    this.log.success(msg);

    if (this.prompt) {
      this.write(`${msg}\n`.green);
    }

    this.ready();
  }

  public unauthorized(): void {
    const authError = (this.socket as TLSSocket).authorizationError;
    const errMsg = `Unauthorized: ${this.cert?.subject.CN} (${authError})`;

    this.log.error(errMsg);
    this.debug();

    if (this.prompt) {
      this.write(`${errMsg}\n`.red);
    }

    // setTimeout(() => {
    //   this.exit();
    // }, 1000);
  }

  public write(msg: string, cb?: (err?: Error) => void): void {
    if (this.socket instanceof WebSocket) {
      this.socket.send(this.convert.toHtml(msg.toString()), cb);
    } else {
      this.socket.write(msg, cb);
    }
  }

  public send(msg: string, keep = true): void {
    this.log.debug(`Sending: ${msg}`, { keep });

    if (this.prompt) {
      this.write(msg);

      if (keep) {
        this.write(`\n${this.prompt}`);
      }
    } else {
      this.log.debug(`NO PROMPT - Skipping full "send" output`);
    }
  }

  public init(commands: string[] = [], forwards: string[] = []): void {
    this.commands = this.commands.concat(commands);
    this.forwards = this.forwards.concat(forwards);

    [...this.commands].concat(this.methods).forEach((cmd) => {
      if (typeof this[cmd] === 'function') {
        this.on(cmd, this[cmd].bind(this));
      } else {
        this.log.warn(`Cannot autoload method: ${cmd}`);
      }
    });

    if (this.isAuthorized) {
      this.forwards.forEach((e) => {
        this.socket.on(e, (...args) => {
          this.log.debug(`Socket.on(${e}) ${args[0]}`, args);
          this.emit(e, ...args);
        });
      });

      this.emit('authorized');
    } else {
      this.emit('unauthorized');
    }

    this.save();
  }

  public debug(): void {
    if (this.socket instanceof TLSSocket) {
      const cert = this.socket.getPeerCertificate();

      this.log.debug(`Cert info`, cert);
    } else if (this.socket instanceof WebSocket) {
      // const cert = this.socket.auth
    }
  }

  public ready(): void {
    this.send(`[${this.id}] ${this.constructor.name} is ready`);
    this.debug();
  }

  public showPrompt(): void {
    if (this.prompt) {
      this.write(`\n${this.prompt}`);
    }
  }

  public reset(): void {
    this.prompt = this.ctl.prompt;

    if (this.relay) {
      this.log.debug(`Exit relay:`, this.relay.signature, this.relay.id);
      this.relay.write('exit');
      delete this.relay;
    }

    this.emit('reset');
  }

  public data(data): void {
    const [cmd, ...args] = data
      .toString()
      .split(' ')
      .map((str) => str.trim());

    if (this.relay) {
      if (cmd === 'exit') {
        this.reset();
      } else if (cmd === 'chdir') {
        this.relay.updatePrompt(this, args[0]);
        this.relay.showPrompt();
      } else {
        this.log.debug(`Relay data: ${data}`, this.relay.signature, this.relay.id);
        this.relay.write(data);
        this.relay.showPrompt();
      }
    } else {
      if (this.commands.includes(cmd)) {
        this.log.debug(`Running cmd: ${data}`);
        this.emit(cmd, ...args);
      } else {
        this.log.warn(`Unknown cmd: ${cmd}`);
        this.send(`Unknown cmd: ${cmd} (available: ${this.commands.join(', ')})`);
      }
    }
  }

  public reg(sig: string): void {
    if (sig) {
      this.signature = sig;
      this.log.info(`Registered as: ${sig}`);
      this.send(`Registered as: ${sig}`);
      this.emit('registered');
    } else {
      this.log.warn(`Cannot register without signature!`, sig);
      this.send(`Cannot register without signature!`);
    }
  }

  public whoami(): void {
    this.send(this.client.signature || this.signature || 'Unknown');
  }

  public ping(): void {
    this.send('pong');
  }

  public info(prop: string): void {
    if (prop && this[prop]) {
      this.log.info(`Show prop info: ${prop}`, this[prop]);
      this.send(JSON.stringify(this[prop], null, 2));
    } else {
      this.log.warn(`Show info missing prop!`);
      this.send(`Show info missing prop! (${Object.keys(this).join(', ')})`);
    }
  }

  public help(): void {
    this.log.info(`HELP: Commands: ${this.commands.join(', ')}`);
    this.send(`HELP: Commands: ${this.commands.join(', ')}`);
  }

  public exit(msg = 'Goodbye.'): void {
    this.log.debug(`Exiting: ${msg}`);
    this.send(`${msg}\n`, false);

    if (this.socket instanceof Socket) {
      this.socket.end();
      this.socket.destroy();
    } else if (this.socket instanceof WebSocket) {
      this.socket.close();
    }

    this.disconnect();
  }

  public close(hasError: boolean) {
    this.log.debug(`Closing`, { hasError });
    this.disconnect();
  }

  public error(err: Error): void {
    this.log.error(err.message);
    this.disconnect();
  }

  public disconnect(): void {
    if (!this.disconnecting) {
      this.disconnecting = true;
      this.log.debug(`Disconnecting`);
      this.ctl.disconnect(this);
      this.emit('disconnect');

      if (this.relay) {
        this.relay.reset();
      }
    }
  }

  public ls(...args: string[]) {
    const { agents } = this.ctl;
    const lines = [...args].concat(['SockzAgent List:'.underline]);

    this.log.info(`Running list command...`);

    if (agents.length) {
      this.ctl.agents.forEach((agent, index) => {
        lines.push(`\t[${index}]`.yellow + ' ' + agent.signature?.cyan + ` | ` + agent.id.blue.italic);
      });

      lines.push('');
      lines.push(`Select an available agent with: "use [0-${this.ctl.agents.length - 1}]"`.italic);
    } else {
      lines.push(`\tNo available agents`);
    }

    this.send(lines.join(`\n`));
  }

  public use(target: string) {
    const index = Number(target);

    if (!isNaN(index) && index >= 0 && index < this.ctl.agents.length) {
      const agent = this.ctl.agents[index];
      const msg = `Using [${index}]: ${agent.signature} | ${agent.id}`;

      this.updatePrompt(agent);

      this.log.info(msg);
      this.send(msg.bgGreen);
      this.relay = agent;
      agent.relay = this;
    } else {
      this.send(`Missing/invalid agent target: ${target}`);
    }
  }

  public end() {
    this.log.debug(`Ending`);
    this.disconnect();
  }

  public updatePrompt(relay: SockzRelay, cwd?: string): void {
    if (cwd && relay.systemInfo) {
      relay.systemInfo.cwd = cwd;
    }

    const promptParts = [relay.signature?.cyan, cwd?.yellow || relay.systemInfo?.cwd.yellow, this.ctl.prompt];

    this.prompt = promptParts.join(':');
  }
}
