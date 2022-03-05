import { Socket } from 'net';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './Logger';
import { Controller } from './Controller';

export class Base extends EventEmitter {
  public id: string;
  public log: Logger;

  constructor(id?: string) {
    super();
    this.id = id || uuidv4();
    this.log = new Logger(`${this.id} (${this.constructor.name})`);
  }
}

export class BaseSocket extends Base {
  public signature?: string;
  public commands: string[] = ['reg', 'ping', 'info', 'help', 'exit'];
  public methods: string[] = ['data', 'close', 'error'];
  public relay?: BaseSocket;
  public disconnecting?: boolean;

  constructor(public ctl: Controller, public socket: Socket, public prompt?: string) {
    super();

    const forwardEvents = ['data', 'close', 'connect', 'drain', 'end', 'error', 'lookup', 'ready', 'timeout'];

    forwardEvents.forEach((e) => {
      this.socket.on(e, (...args) => {
        this.log.debug(`Socket.on(${e})`, args);
        this.emit(e, ...args);
      });
    });

    this.init();
  }

  public write(msg: string, cb?: (err?: Error) => void): void {
    this.socket.write(msg, cb);
  }

  public send(msg: string, keep = true): void {
    if (this.prompt) {
      this.write(msg);

      if (keep) {
        this.write(this.prompt);
      }
    }
  }

  public init(commands: string[] = []): void {
    this.commands = this.commands.concat(commands);
    this.ready();

    [...this.commands].concat(this.methods).forEach((cmd) => {
      if (typeof this[cmd] === 'function') {
        this.on(cmd, this[cmd].bind(this));
      } else {
        this.log.warn(`Cannot autoload method: ${cmd}`);
      }
    });
  }

  public ready(): void {
    this.send(`[${this.id}] ${this.constructor.name} is ready`);
  }

  public reset(): void {
    this.prompt = this.ctl.prompt;

    if (this.relay) {
      this.log.debug(`Exit relay:`, this.relay.signature, this.relay.id);
      this.relay.write('exit');
      delete this.relay;
    }
  }

  public data(data): void {
    const [cmd, ...args] = data
      .toString()
      .split(' ')
      .map((str) => str.trim());

    if (this.relay) {
      if (cmd === 'exit') {
        this.reset();
      } else {
        this.log.debug(`Relay data: ${data}`, this.relay.signature, this.relay.id);
        this.relay.write(data);

        if (this.relay.prompt) {
          this.relay.write(this.relay.prompt);
        }
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
    } else {
      this.log.warn(`Cannot register without signature!`, sig);
      this.send(`Cannot register without signature!`);
    }
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
    this.send(`${msg}\n`, false);
    this.socket.destroy();
  }

  public end() {
    this.log.debug(`Ending`);
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

      if (this.relay) {
        this.relay.reset();
        this.relay.send('Disconnected');
      }
    }
  }
}
