import 'colors';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SockzLogger } from './SockzLogger';
import { ISockzBase, ISockzSystemInfo } from './contracts';

export class SockzBase extends EventEmitter implements ISockzBase {
  public id: string;
  public log: SockzLogger;
  public systemInfo?: ISockzSystemInfo;

  constructor(id?: string) {
    super();
    this.id = id || uuidv4();
    this.log = new SockzLogger(`${this.id} (${this.constructor.name})`);

    this.load();
  }

  load(): void {
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
}
