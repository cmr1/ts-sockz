import 'colors';
import { Socket } from 'net';
import { SockzRelay, ISockzClient } from './SockzBase';
import { SockzController } from './SockzController';

export class SockzClient extends SockzRelay implements ISockzClient {
  constructor(public ctl: SockzController, public socket: Socket) {
    super(ctl, socket, ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use']);
    this.on('reset', this.showPrompt.bind(this));
  }
}
