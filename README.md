# ts-sockz

TypeScript - Fun with sockets

### Contents
- [Simple](#simple)
- [Options](#options)
- [Defaults](#defaults)
- [Advanced](#advanced)
- [Environment](#environment)
- [WebClient](#webclient)
- [Documentation](https://cmr1.github.io/ts-sockz)

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
netcat localhost 2222
# Other TCP connection (telnet)
telnet localhost 2222
```

Visit the web client console:

- [localhost:8080](http://localhost:8080)

## Options

```bash
npx sockz <role> <host> <agentPort> <clientPort> <webPort> <prompt>
```

Allowed values:

- role: `server | agent`
- host: `any<hostname | ipaddress>`
- agentPort: `number`
- clientPort: `number`
- webPort: `number`
- prompt: `string`


## Defaults

- role: `server`
- host: `127.0.0.1`
- agentPort: `1111`
- clientPort: `2222`
- webPort: `8080`
- prompt: `"sockz> "`


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

To customize the session prompt:

```bash
# Start a server and use poop for client prompt
npx sockz server 0.0.0.0 1111 2222 8080 "💩 "

# Connect an authorized client
ncat --ssl --ssl-cert certs/client_cert.pem --ssl-key certs/client_key.pem localhost 2222
# Authorized client connection output
Authorized: Client
[id] SockzClient is ready
sockz> help
HELP: Commands: reg, whoami, exit, ping, info, help, ls, use
sockz>

# Connect an unauthorized client (use agent key)
ncat --ssl --ssl-cert certs/agent_cert.pem --ssl-key certs/agent_key.pem localhost 2222
# Unuthorized client connection output
Unauthorized: Agent (DEPTH_ZERO_SELF_SIGNED_CERT)
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

*Supports all the same options*

Also available from docker:

https://github.com/cmr1/docker-sockz

```
docker run cmr1/sockz
```

## Environment

**Additional configuration options available as env vars:**

- *All cert/key paths are resolved from `certs/` directory*

```bash
# Server environment variables
SERVER_HOST_NAME = 'localhost'
SERVER_CERT_NAME = 'server_cert.pem'
SERVER_KEY_NAME = 'server_key.pem'
# Comma separated list of ca cert names (required for auth)
SERVER_CA_NAME = 'server_cert.pem'

# Agent environment variables
AGENT_CERT_NAME = 'agent_cert.pem'
AGENT_KEY_NAME = 'agent_key.pem'
# Comma separated list of ca cert names (optional)
AGENT_CA_LIST = ''
```

## WebClient

Visit [https://localhost:8080/](https://localhost:8080/) in your browser

*Self-signed cert, will have a warning*
