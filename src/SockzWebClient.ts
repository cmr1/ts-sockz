import { WebSocket } from 'ws';
import { SockzRelay, ISockzClient } from './SockzBase';
import { SockzController } from './SockzController';

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
