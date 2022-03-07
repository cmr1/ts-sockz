import { WebSocket } from 'ws';
import { ISockzClient } from './contracts';
import { SockzController } from './SockzController';
import { SockzClient } from './SockzClient';
import { SockzRelay } from './SockzRelay';

export class SockzWebClient extends SockzRelay implements ISockzClient {
  public client: SockzClient;

  constructor(public ctl: SockzController, public socket: WebSocket) {
    super(ctl, socket, ctl.prompt);

    this.client = this.ctl.startClient(true);
    this.init();

    this.socket.on('message', (data) => {
      const msg = data.toString().trim();

      if (!this.clientAuthorized && msg && /^auth:(.*):(.*)$/.test(msg)) {
        const [auth, key, cert] = msg.split(':');

        this.log.debug(`Attempt client auth: ${auth} key=${key} cert=${cert}`);

        this.client
          .authorize(this, Buffer.from(key, 'base64'), Buffer.from(cert, 'base64'))
          .then((sig) => {
            if (sig) {
              // this.reg(sig);
              this.clientAuthorized = !!sig;
              // this.init();

              this.client.socket.on('data', (data) => {
                this.log.debug(`Nested client data: ${data}`);
                this.write(data);
              });
            } else {
              this.write(`Invalid credentials\n`.red);
            }
          })
          .catch(this.log.error.bind(this));
      } else if (this.clientAuthorized) {
        this.log.debug(`Forward with authd client: ${data}`);
        this.client.write(data.toString());
      } else {
        this.log.debug(`Ignoring msg (not auth): ${msg}`);
      }
    });
  }

  public init(): void {
    super.init();

    // this.on('message', this.data.bind(this));
    this.on('reset', this.showPrompt.bind(this));
    // this.on('message', (data) => {
    //   this.log.warn(`Received message: ${data}`);

    //   if (this.client) {
    //     this.client.data(data);
    //   }
    // });
  }

  public start(): void {
    // start web client?
  }
}
