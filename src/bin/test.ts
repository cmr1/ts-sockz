import crypto from 'crypto';

const SECRET = 'super secret';
const MESSAGE = 'Hello world';

// crypto.generateKeyPair(
//   'ed25519',
//   {
//     modulusLength: 4096,
//     publicKeyEncoding: {
//       type: 'spki',
//       format: 'der'
//       // format: 'jwk'
//     },
//     privateKeyEncoding: {
//       type: 'pkcs8',
//       format: 'der',
//       cipher: 'aes-256-cbc',
//       passphrase: SECRET
//     }
//   },
//   (err, publicKey, privateKey) => {
//     console.log({
//       err,
//       publicKey,
//       privateKey
//     });
//   }
// );

const rsaDerOptions: crypto.RSAKeyPairOptions<'der', 'der'> = {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der',
    // cipher: 'aes-256-cbc',
    passphrase: SECRET
  }
};

const rsaPemOptions: crypto.RSAKeyPairOptions<'pem', 'pem'> = {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    // cipher: 'aes-256-cbc',
    // passphrase: ''
  }
};

// const derOptions: crypto.DERKEY

// crypto.generateKeyPair('')

crypto.generateKeyPair('rsa', rsaPemOptions, (err, publicKey, privateKey) => {
  // Handle errors and use the generated key pair.
  // console.log({
  //   err,
  //   publicKey,
  //   privateKey
  // });

  console.log(privateKey);
  console.log(publicKey);

  const ENCRYPTED = crypto.publicEncrypt(publicKey, Buffer.from(MESSAGE));
  const DECRYPTED = crypto.privateDecrypt(privateKey, Buffer.from(ENCRYPTED));
  // const DECRYPTED = crypto.privateDecrypt({ key: privateKey, passphrase: SECRET }, Buffer.from(ENCRYPTED));

  // console.log('Done', {
  //   MESSAGE,
  //   ENCRYPTED,
  //   DECRYPTED
  // });

  console.log('Done');
  console.log(`MESSAGE: ${MESSAGE}`);
  console.log(`ENCRYPTED: ${ENCRYPTED}`);
  console.log(`DECRYPTED: ${DECRYPTED}`);
});

//   // from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
//   function str2ab(str) {
//     const buf = new ArrayBuffer(str.length);
//     const bufView = new Uint8Array(buf);
//     for (let i = 0, strLen = str.length; i < strLen; i++) {
//       bufView[i] = str.charCodeAt(i);
//     }
//     return buf;
//   }

//   function importRsaKey(pem) {
//     // fetch the part of the PEM string between header and footer
//     const pemHeader = "-----BEGIN PUBLIC KEY-----";
//     const pemFooter = "-----END PUBLIC KEY-----";
//     const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
//     // base64 decode the string to get the binary data
//     const binaryDerString = window.atob(pemContents);
//     // convert from a binary string to an ArrayBuffer
//     const binaryDer = str2ab(binaryDerString);

//     return window.crypto.subtle.importKey(
//       "spki",
//       binaryDer,
//       {
//         name: "RSA-OAEP",
//         hash: "SHA-256"
//       },
//       true,
//       ["encrypt"]
//     );
//   }
