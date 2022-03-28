import 'dotenv/config';
import fs from 'fs';
import pem from 'pem';
import path from 'path';
import crypto from 'crypto';

const certDir = path.join(__dirname, '..', '..', 'certs');

const {
  SERVER_CA_NAME = 'Sockz.io',
  SERVER_ALT_NAMES = 'ctl.sockz.io',
  TERMINAL_ALT_NAMES = 'cli.sockz.io',
  SERVER_CA_KEY_NAME = 'CA.key.pem',
  SERVER_CA_CERT_NAME = 'CA.cert.pem'
} = process.env;

const genRandom = (bytes = 32, encoding: BufferEncoding = 'hex') => crypto.randomBytes(bytes).toString(encoding);

const serverPassword = genRandom();
const sessionPassword = genRandom();
const clientPassword = genRandom();
const agentPassword = genRandom();

console.log('Using generate password set:', {
  serverPassword,
  sessionPassword,
  clientPassword,
  agentPassword
});

const toAry = (data: string, sep = ',') => data.split(sep).map((str) => str.trim());

const serverOptions: pem.CertificateCreationOptions = {
  // csr: '',
  // altNames: TERMINAL_ALT_NAMES.split(',').map((str) => str.trim()),
  altNames: toAry(SERVER_ALT_NAMES),
  // altNames: [
  //   'app.sockz.io',
  //   'wss.sockz.io',
  //   'www.sockz.io',
  //   'test.sockz.io',
  //   'ctl.sockz.io',
  //   'localhost',
  //   'localhost:3000'
  // ],
  days: 365,
  hash: 'sha256',
  selfSigned: true,
  commonName: SERVER_CA_NAME,
  clientKeyPassword: serverPassword
};

const sessionOptions: pem.CertificateCreationOptions = {
  // csr: '',
  // altNames: [],
  days: 365,
  hash: 'sha256',
  selfSigned: true,
  clientKeyPassword: sessionPassword
};

const getClientOptions = (
  commonName: string,
  serviceKey: string,
  serviceCertificate: string,
  serviceKeyPassword: string
): pem.CertificateCreationOptions => {
  return {
    // csr: '',
    // extFile: '/path/to/ext',
    // config: '/path/to/config',
    // csrConfigFile: '/path/to/csr/config',
    keyBitsize: 4096,
    hash: 'sha256',
    country: 'US',
    state: 'Colorado',
    locality: 'Denver',
    organization: 'CMR1',
    // organizationUnit: 'Sockz',
    // emailAddress: 'client@example.com',
    altNames: toAry(TERMINAL_ALT_NAMES),
    // altNames: [
    //   'cli.sockz.io',
    //   'terminal.sockz.io',
    //   'term.sockz.io',
    //   'sockz-console.razorsites.co',
    //   'localhost',
    //   'localhost:3000'
    // ],
    commonName,
    days: 1,
    serial: 1234,
    // serialFile: '/path/to/serial', // TODO: Submit PR for type fix?
    selfSigned: false,
    serviceKey,
    serviceCertificate,
    serviceKeyPassword,
    clientKeyPassword: clientPassword
  };
};

const getAgentOptions = (
  commonName = 'Agent',
  serviceKey: string,
  serviceCertificate: string,
  serviceKeyPassword: string
): pem.CertificateCreationOptions => {
  return {
    // csr: '',
    // extFile: '/path/to/ext',
    // config: '/path/to/config',
    // csrConfigFile: '/path/to/csr/config',
    altNames: ['localhost'],
    keyBitsize: 4096,
    hash: 'sha256',
    country: 'US',
    state: 'Colorado',
    locality: 'Denver',
    organization: 'CMR1',
    organizationUnit: 'Sockz',
    // emailAddress: 'client@example.com',
    commonName,
    days: 1,
    // serial: 1234,
    // serialFile: '/path/to/serial', // TODO: Submit PR for type fix?
    selfSigned: true,
    // selfSigned: false,
    // serviceKey: server.serviceKey, // or serviceKey?
    // serviceCertificate: server.certificate,
    // serviceKeyPassword: serverPassword,
    serviceKey,
    serviceCertificate,
    serviceKeyPassword,
    clientKeyPassword: clientPassword
  };
};

const writeKeysSync = (name: string, keys: pem.CertificateCreationResult) => {
  for (const k in keys) {
    const data = keys[k];
    const filename = [name, k, 'pem'].join('.');
    const filepath = path.join(certDir, filename);

    console.log('Generating:', name, k, filename);

    fs.writeFileSync(filepath, data);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Failed writing file: ${filepath}`);
    }

    console.log('Saved file:', filepath);
  }
};

// Generate session keypair
pem.createCertificate(sessionOptions, (sessionErr, sessionData) => {
  if (sessionErr) throw sessionErr;

  writeKeysSync('session', sessionData);
});

const serverCertFile = path.join(certDir, SERVER_CA_CERT_NAME);
const serviceKeyFile = path.join(certDir, SERVER_CA_KEY_NAME);

if (fs.existsSync(serverCertFile) && fs.existsSync(serviceKeyFile)) {
  console.log('Reusing Server KeyPair', { serverCertFile, serviceKeyFile });

  // const serverKey = fs.readFileSync(path.join(certDir, 'server.clientKey.pem'), 'utf-8');
  const serverCert = fs.readFileSync(serverCertFile, 'utf-8');
  const serviceKey = fs.readFileSync(serviceKeyFile, 'utf-8');

  console.log('Generating Client KeyPair ...');
  pem.createCertificate(getClientOptions('Client', serviceKey, serverCert, serverPassword), (clientErr, clientKeys) => {
    if (clientErr) throw clientErr;

    writeKeysSync('client', clientKeys);
  });

  console.log('Generating Agent KeyPair ...');
  pem.createCertificate(getAgentOptions('Agent', serviceKey, serverCert, clientPassword), (clientErr, clientKeys) => {
    if (clientErr) throw clientErr;

    writeKeysSync('agent', clientKeys);
  });
} else {
  console.log('Generating Server KeyPair ...');

  pem.createCertificate(serverOptions, (serverErr, serverData) => {
    if (serverErr) throw serverErr;

    writeKeysSync('server', serverData);

    console.log('Generating Client KeyPair ...');
    pem.createCertificate(
      getClientOptions('Client', serverData.serviceKey, serverData.certificate, serverPassword),
      (clientErr, clientKeys) => {
        if (clientErr) throw clientErr;

        writeKeysSync('client', clientKeys);
      }
    );

    console.log('Generating Agent KeyPair ...');
    pem.createCertificate(
      getAgentOptions('Agent', serverData.serviceKey, serverData.certificate, clientPassword),
      (clientErr, clientKeys) => {
        if (clientErr) throw clientErr;

        writeKeysSync('agent', clientKeys);
      }
    );

    // console.log('Generating Agent KeyPair ...');
    // pem.createCertificate(getAgentOptions('Agent',), (agentErr, agentKeys) => {
    //   if (agentErr) throw agentErr;

    //   writeKeysSync('agent', agentKeys);
    // });
  });
}
