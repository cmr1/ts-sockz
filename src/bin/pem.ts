import fs from 'fs';
import pem from 'pem';
import path from 'path';

const certDir = path.join(__dirname, '..', '..', 'tmp', 'certs');

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
DNS.1 = host1.example.com
DNS.2 = host2.example.com
DNS.3 = host3.example.com
`;

const serverPassword = 'password';
const clientPassword = 'super secret';
const agentPassword = 'im an agent';

const serverOptions: pem.CertificateCreationOptions = {
  // csr: '',
  // altNames: [],
  days: 1,
  hash: 'sha256',
  selfSigned: true,
  clientKeyPassword: serverPassword
};

const getClientOptions = (
  server: pem.CertificateCreationResult,
  commonName = 'Client'
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
    serviceKey: server.serviceKey, // or serviceKey?
    serviceCertificate: server.certificate,
    serviceKeyPassword: serverPassword,
    clientKeyPassword: clientPassword
  };
};

const getAgentOptions = (
  server: pem.CertificateCreationResult,
  commonName = 'Agent'
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

pem.createCertificate(serverOptions, (serverErr, serverKeys) => {
  if (serverErr) throw serverErr;

  writeKeysSync('server', serverKeys);

  // pem.createCSR(clientCsrOptions, (csrErr, csrData) => {
  //   if (csrErr) throw csrErr;

  //   pem.createCertificate(getClientOptions(serverKeys, csrData.csr), (clientErr, clientKeys) => {
  //     if (clientErr) throw clientErr;

  //     writeKeysSync('cilent', clientKeys);
  //   });
  // });

  pem.createCertificate(getClientOptions(serverKeys), (clientErr, clientKeys) => {
    if (clientErr) throw clientErr;

    writeKeysSync('cilent', clientKeys);
  });

  pem.createCertificate(getAgentOptions(serverKeys), (agentErr, agentKeys) => {
    if (agentErr) throw agentErr;

    writeKeysSync('agent', agentKeys);
  });
});
