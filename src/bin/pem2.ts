import fs from 'fs';
import pem from 'pem';
import path from 'path';
import crypto from 'crypto';

const certDir = path.join(__dirname, '..', '..', 'certs');

const caExtFile = `
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]
commonName = Common Name
commonName_max = 64

[v3_req]
basicConstraints = critical,CA:TRUE
`;

const certExtFile = `
[req]
req_extensions = v3_req

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = app.sockz.io
DNS.2 = ctl.sockz.io
DNS.3 = test.sockz.io
`;

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

const serverOptions: pem.CertificateCreationOptions = {
  // csr: '',
  // altNames: [],
  days: 365,
  hash: 'sha256',
  selfSigned: true,
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
    // altNames: [],
    // keyBitsize: 4096,
    // hash: 'sha256',
    // country: 'US',
    // state: 'Colorado',
    // locality: 'Denver',
    // organization: 'CMR1',
    // organizationUnit: 'Sockz',
    // emailAddress: 'client@example.com',
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
  commonName = 'Agent'
  // serviceKey: string,
  // serviceCertificate: string,
  // serviceKeyPassword: string,
): pem.CertificateCreationOptions => {
  return {
    // csr: '',
    // extFile: '/path/to/ext',
    // config: '/path/to/config',
    // csrConfigFile: '/path/to/csr/config',
    // altNames: [],
    // keyBitsize: 4096,
    // hash: 'sha256',
    // country: 'US',
    // state: 'Colorado',
    // locality: 'Denver',
    // organization: 'CMR1',
    // organizationUnit: 'Sockz',
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
    clientKeyPassword: agentPassword
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

const serverCertFile = path.join(certDir, 'server.certificate.pem');
const serviceKeyFile = path.join(certDir, 'server.serviceKey.pem');

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
  pem.createCertificate(getAgentOptions('Agent'), (clientErr, clientKeys) => {
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
    pem.createCertificate(getAgentOptions('Agent'), (agentErr, agentKeys) => {
      if (agentErr) throw agentErr;

      writeKeysSync('agent', agentKeys);
    });
  });
}
