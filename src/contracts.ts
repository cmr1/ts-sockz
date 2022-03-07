import 'colors';
import { UserInfo } from 'os';
import Convert from 'ansi-to-html';
import { Socket } from 'net';
import { TLSSocket, TLSSocketOptions } from 'tls';
import { WebSocket } from 'ws';
import { SockzController } from './SockzController';

export interface ISockzSystemInfo {
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

export interface ISockzBase {
  id: string;
  log: ISockzLogger;
  systemInfo?: ISockzSystemInfo;

  load(): void;
}

export interface IBaseConnectable extends ISockzBase {
  ctl: SockzController;
  socket: TLSSocket | WebSocket;
  prompt?: string;
  signature?: string;
  commands: string[];
  forwards: string[];
  methods: string[];
  relay?: IBaseConnectable;
  disconnecting?: boolean;
  convert: Convert;

  write(msg: string, cb?: (err?: Error) => void): void;
  send(msg: string, keep?: boolean): void;
  init(commands?: string[], forwards?: string[]): void;
  ready(): void;
  reset(): void;
  data(data: any): void;
  reg(sig: string): void;
  ping(): void;
  info(prop: string): void;
  help(): void;
  exit(msg?: string): void;
  close(hasError: boolean): void;
  error(err: Error): void;
  disconnect(): void;
  showPrompt(): void;
  updatePrompt(relay: IBaseConnectable, cwd?: string): void;
}

export interface ISockzClient {
  ls(...args: string[]): void;
  use(target: string): void;
}

export interface ISockzAgent {
  handle(action: string): void;
  start(): void;
  notify(client: IBaseConnectable): void;
}

export enum SockzLogTextColor {
  BLACK = 'black',
  RED = 'red',
  GREEN = 'green',
  YELLOW = 'yellow',
  BLUE = 'blue',
  MAGENTA = 'magenta',
  CYAN = 'cyan',
  WHITE = 'white',
  GRAY = 'gray',
  GREY = 'grey',
  BRIGHT_RED = 'brightRed',
  BRIGHT_GREEN = 'brightGreen',
  BRIGHT_YELLOW = 'brightYellow',
  BRIGHT_BLUE = 'brightBlue',
  BRIGHT_MAGENTA = 'brightMagenta',
  BRIGHT_CYAN = 'brightCyan',
  BRIGHT_WHITE = 'brightWhite'
}

export enum SockzLogTextBgColor {
  BLACK = 'bgBlack',
  RED = 'bgRed',
  GREEN = 'bgGreen',
  YELLOW = 'bgYellow',
  BLUE = 'bgBlue',
  MAGENTA = 'bgMagenta',
  CYAN = 'bgCyan',
  WHITE = 'bgWhite',
  GRAY = 'bgGray',
  GREY = 'bgGrey',
  BRIGHT_RED = 'bgBrightRed',
  BRIGHT_GREEN = 'bgBrightGreen',
  BRIGHT_YELLOW = 'bgBrightYellow',
  BRIGHT_BLUE = 'bgBrightBlue',
  BRIGHT_MAGENTA = 'bgBrightMagenta',
  BRIGHT_CYAN = 'bgBrightCyan',
  BRIGHT_WHITE = 'bgBrightWhite'
}

export enum SockzLogTextStyle {
  RESET = 'reset',
  BOLD = 'bold',
  DIM = 'dim',
  ITALIC = 'italic',
  UNDERLINE = 'underline',
  INVERSE = 'inverse',
  HIDDEN = 'hidden',
  STRIKETHROUGH = 'strikethrough',
  RAINBOW = 'rainbow',
  ZEBRA = 'zebra',
  AMERICA = 'america',
  TRAP = 'trap',
  RANDOM = 'random'
}

export type SockzLogTextThemeValue = SockzLogTextColor | SockzLogTextBgColor | SockzLogTextStyle;
export type SockzLogMethod = (...args: any[]) => void;

export interface ISockzLogTextTheme {
  [theme: string]: SockzLogTextThemeValue | SockzLogTextThemeValue[];
}

export interface ISockzLogOptions {
  timestamp?: boolean;
  throws?: boolean;
  prefix?: string;
  theme?: string;
  color?: SockzLogTextColor;
}

export interface ISockzLogOptionsMap {
  [name: string]: ISockzLogOptions;
}

export interface ISockzLogger {
  colorize: (args: any, color: SockzLogTextColor) => any;

  timestamp: () => string;

  log: (args: any, options?: ISockzLogOptions) => void;
  out: (options?: ISockzLogOptions) => SockzLogMethod;
  info: SockzLogMethod;
  warn: SockzLogMethod;
  error: SockzLogMethod;
  debug: SockzLogMethod;
  success: SockzLogMethod;
}
