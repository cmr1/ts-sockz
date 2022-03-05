// import os, { UserInfo } from 'os';
import fs from 'fs';
import path from 'path';
import { Socket } from 'net';
import { BaseSocket } from './Base';
import { Controller } from './Controller';

export class Client extends BaseSocket {
  constructor(public ctl: Controller, public socket: Socket) {
    super(ctl, socket, ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use', 'GET', 'POST']);
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
      this.prompt = `${agent.signature}> `;
      this.send(`Using [${index}]: ${agent.signature} | ${agent.id}`);
      this.relay = agent;
      agent.relay = this;
    } else {
      this.send(`Missing/invalid agent target: ${target}`);
    }
  }

  public GET(...args: any[]): void {
    this.log.info(`GET for agent`, args);

    const [page, ...rest] = args;
    let status = 'HTTP/2 404 Not Found';
    let content = 'Not Found';
    let contentType = 'text/html';

    // if (page === '/') {
    //   const agentWebJs = fs.readFileSync(path.join(__dirname, 'scripts', 'agent-web.js')).toString();
    //   status = 'HTTP/2 200 OK';
    //   content = `<html>
    //       <head>
    //         <title>sockz agent</title>
    //         <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" integrity="sha512-894YE6QWD5I59HgZOGReFYm4dnWc1Qt5NtvYSaNcOP+u1T9qYdvdihz0PPSiiqn/+/3e7Jo4EaG7TubfWGUrMQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    //         <script>${agentWebJs}</script>
    //         <style>pre { background: black; color: white; padding: 25px; }</style>
    //       </head>
    //       <body>
    //         <h1>Socks Agent</h1>
    //         <hr />
    //         <pre>$ </pre>
    //       </body>
    //     </html>
    //   `;
    // }

    const resp = [
      status,
      'server: sockz',
      `date: ${Date.now()}`,
      `content-type: ${contentType}`,
      `content-length: ${content.length}`,
      '',
      content
    ];

    this.log.info('Sending HTTP payload');
    this.log.info(resp.join(`\r\n`));

    this.write(resp.join(`\r\n`));
  }

  public POST(...args: any[]): void {
    this.log.info(`POST for agent`, args);

    const [page, ...rest] = args;
    let status = 'HTTP/2 400 Bad Request';
    let content = JSON.stringify({ message: 'Bad Request' });
    let contentType = 'application/json';

    if (page === '/send') {
      status = 'HTTP/2 200 OK';
      content = JSON.stringify({
        data: 'response'
      });
    }

    const resp = [
      status,
      'server: sockz',
      `date: ${Date.now()}`,
      `content-type: ${contentType}`,
      `content-length: ${content.length}`,
      '',
      content
    ];

    this.log.info('Sending HTTP payload');
    this.log.info(resp.join(`\r\n`));

    this.write(resp.join(`\r\n`));
  }
}
