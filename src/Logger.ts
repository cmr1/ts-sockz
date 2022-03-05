import colors from 'colors/safe';

export enum LogTextColor {
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

export enum LogTextBgColor {
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

export enum LogTextStyle {
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

export type LogTextThemeValue = LogTextColor | LogTextBgColor | LogTextStyle;
export type LogMethod = (...args: any[]) => void;

export interface ILogTextTheme {
  [theme: string]: LogTextThemeValue | LogTextThemeValue[];
}

export interface ILogOptions {
  timestamp?: boolean;
  throws?: boolean;
  prefix?: string;
  theme?: string;
  color?: LogTextColor;
}

export interface ILogOptionsMap {
  [name: string]: ILogOptions;
}

export interface ILogger {
  colorize: (args: any, color: LogTextColor) => any;

  timestamp: () => string;

  log: (args: any, options?: ILogOptions) => void;
  out: (options?: ILogOptions) => LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  debug: LogMethod;
  success: LogMethod;
}

export class Logger implements ILogger {
  public verbose = false;
  public options: ILogOptionsMap = {
    info: {
      timestamp: true
    },
    warn: {
      prefix: 'WARNING:',
      timestamp: true,
      color: LogTextColor.YELLOW
    },
    error: {
      prefix: 'ERROR:',
      timestamp: true,
      color: LogTextColor.RED
    },
    success: {
      prefix: 'SUCCESS:',
      timestamp: true,
      color: LogTextColor.GREEN
    },
    debug: {
      prefix: 'DEBUG:',
      timestamp: true,
      color: LogTextColor.CYAN
    }
  };

  constructor(public prefix?: string, public theme?: ILogTextTheme) {
    this.verbose = this.verbose || !!process.env.VERBOSE;

    if (theme) {
      colors.setTheme(theme);
    }
  }

  timestamp(): string {
    // Create new Date object
    const d = new Date();

    // Return date in the format "M/D/YYYY h:i:s AM/PM"
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  colorize(args: any, color: LogTextThemeValue | string): any {
    if (typeof args === 'string') {
      return colors[color](args);
    } else if (typeof args === 'object') {
      if (Array.isArray(args)) {
        return args.map((arg) => (typeof arg === 'string' ? colors[color](arg) : arg));
      } else {
        const argsCopy = { ...args };

        Object.keys(argsCopy).forEach((key) => {
          if (typeof argsCopy[key] === 'string') {
            argsCopy[key] = colors[color](argsCopy[key]);
          }
        });

        return argsCopy;
      }
    }

    return args;
  }

  log(args: any, options?: ILogOptions) {
    let output = Array.isArray(args) ? [...args] : [args];

    if (options?.prefix) {
      output = [options.prefix].concat(output);
    }

    if (this.prefix) {
      output = [this.prefix].concat(output);
    }

    if (options?.timestamp) {
      output = [`[${this.timestamp()}]`].concat(output);
    }

    if (options?.color) {
      output = this.colorize(output, options.color);
    }

    if (options?.theme) {
      output = this.colorize(output, options.theme);
    }

    console.log(...output);
  }

  out =
    (options?: ILogOptions) =>
    (...args: any[]) =>
      this.log(args, options);

  info = this.out(this.options.info);
  warn = this.out(this.options.warn);
  error = this.out(this.options.error);
  success = this.out(this.options.success);
  debug = (...args: any[]) => {
    if (this.verbose) {
      this.out(this.options.debug)(...args);
    }
  };
}
