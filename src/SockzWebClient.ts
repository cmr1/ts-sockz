import { WebSocket } from 'ws';
import { ISockzClient } from './contracts';
import { SockzController } from './SockzController';
import { SockzRelay } from './SockzRelay';

export class SockzWebClient extends SockzRelay implements ISockzClient {
  constructor(public ctl: SockzController, public socket: WebSocket) {
    super(ctl, socket, ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use'], ['message']);

    this.on('message', this.data.bind(this));
    this.on('reset', this.showPrompt.bind(this));
  }
}
