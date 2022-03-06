import 'colors';
import { Socket } from 'net';
import { ISockzClient } from './contracts';
import { SockzController } from './SockzController';
import { SockzRelay } from './SockzRelay';

export class SockzClient extends SockzRelay implements ISockzClient {
  constructor(public ctl: SockzController, public socket: Socket) {
    super(ctl, socket, ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use']);
    this.on('reset', this.showPrompt.bind(this));
  }
}
