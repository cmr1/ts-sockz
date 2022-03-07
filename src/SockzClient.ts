import 'colors';
// import { Socket } from 'net';
import tls, { PeerCertificate, TLSSocket, TLSSocketOptions } from 'tls';
import { ISockzClient } from './contracts';
import { SockzController } from './SockzController';
import { SockzRelay } from './SockzRelay';

export class SockzClient extends SockzRelay implements ISockzClient {
  public requireAuthorized = true;

  constructor(public ctl: SockzController, public socket: TLSSocket, public quiet?: boolean) {
    super(ctl, socket, quiet ? undefined : ctl.prompt);
  }

  public init(): void {
    super.init(['ls', 'use']);
    this.on('reset', this.showPrompt.bind(this));
  }

  public data(data: any): void {
    if (this.quiet) {
      this.log.info(`QUIET DATA: ${data}`);
      if (this.client) {
        this.client.write(data);
      }
    } else {
      super.data(data);
    }
  }

  public start(): void {
    this.log.info(`Starting SockzClient...`);

    // this.signature = `sockz:client`;

    // this.socket = tls.connect(
    //   { ...this.ctl.tlsOptions('client'), host: this.ctl.host, port: this.ctl.clientPort },
    //   () => {
    //     this.log.info(`SockzClient connected to controller: ${this.ctl.host}:${this.ctl.clientPort}`);
    //     this.init();
    //     this.write(`reg ${this.signature}`);
    //   }
    // );
  }

  public authorize(client: SockzRelay, key: Buffer | string, cert: Buffer | string): Promise<string | null> {
    this.client = client;
    // this.signature = `sockz:client`;

    const tlsOptions: TLSSocketOptions = {
      key,
      cert,
      requestCert: true,
      rejectUnauthorized: false
    };

    return new Promise((resolve, reject) => {
      try {
        this.socket = tls.connect({ ...tlsOptions, host: this.ctl.host, port: this.ctl.clientPort }, () => {
          this.log.info(`SockzClient connected to controller: ${this.ctl.host}:${this.ctl.clientPort}`);

          const cert = this.socket.getCertificate() as PeerCertificate;

          this.signature = cert.subject.CN;

          this.init();
          // this.reg(this.signature);
          this.write(`reg ${this.signature}`);
          resolve(this.signature);
        });
      } catch (err) {
        this.log.error(err);
        resolve(null);
      }
    });
  }
}
