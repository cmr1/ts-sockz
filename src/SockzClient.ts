import 'colors';
// import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { ISockzClient } from './contracts';
import { SockzController } from './SockzController';
import { SockzRelay } from './SockzRelay';

export class SockzClient extends SockzRelay implements ISockzClient {
  public requireAuthorized = true;

  constructor(public ctl: SockzController, public socket: TLSSocket) {
    super(ctl, socket, ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use']);
    this.on('reset', this.showPrompt.bind(this));

    this.log.warn('init');
  }
}
