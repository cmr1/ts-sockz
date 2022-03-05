# ts-sockz

TypeScript - Fun with sockets

### Contents
- [Simple](#simple)
- [Options](#options)
- [Defaults](#defaults)
- [Advanced](#advanced)

## Simple

```bash
# Start a local control server
npx sockz
```

```bash
# Start a local control agent
npx sockz agent
```

```bash
# Connect to control panel (netcat)
netcat localhost 54321
# Other TCP connection (telnet)
telnet localhost 54321
```

## Options

```bash
npx sockz <role> <host> <agentPort> <clientPort> <prompt>
```

Allowed values:

- role: `server | agent`
- host: `any<hostname | ipaddress>`
- agentPort: `number`
- clientPort: `number`
- prompt: `string`


## Defaults

- role: `server`
- host: `127.0.0.1`
- agentPort: `12345`
- clientPort: `54321`
- prompt: `\ntroll> `


## Advanced

To be able to connect remotely, use host `0.0.0.0`

```bash
# Start remote control server
npx sockz server 0.0.0.0
```

To customize agent & client ports:

```bash
# Start control server with custom ports
npx sockz server 0.0.0.0 7331 1337
# Connect agent
npx sockz agent <host> 7331
# Connect session
netcat <host> 1337
```

Install globally to run without `npx`

```bash
npm install --global sockz
# Or shortcut (same as above)
npm i -g sockz
```

```bash
# Start a server
sockz server
# Start an agent
sockz agent
```
