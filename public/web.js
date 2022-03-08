$(function(){
  let buff = [];
  // let socket = new WebSocket("wss://{{host}}:{{webPort}}");
  let socket, publicKey, clientKey, clientCert, clientAuth;

  clientKey = localStorage.getItem('clientKey');
  clientCert = localStorage.getItem('clientCert');

  if (clientKey) {
    $('#clientKey').val(clientKey);
  }

  if (clientCert) {
    $('#clientCert').val(clientCert);
  }

  $('#authorize').on('click', function() {
    clientKey = $('#clientKey').val();
    clientCert = $('#clientCert').val();

    auth(clientKey, clientCert);
  });

  function scroll() {
    var elem = document.getElementById('console');
    elem.scrollTop = elem.scrollHeight;
  }

  function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  function importRsaKey(pem) {
    const pemParts = pem.split('-----');
    const pemContents = pemParts.slice(2, -2)[0];
    const binaryDerString = window.atob(pemContents);
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
  }

  function encryptMessage(message) {
    if (message.length > 446) {
      throw new Error('Exceeding max length for encrypted msg', message.length, message);
    }

    let enc = new TextEncoder();
    let encoded = enc.encode(message);

    console.log('Encrypting message:', message);

    if (!publicKey) return Promise.reject('Missing publicKey');

    return window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      str2ab(message)
    );
  }

  function connect() {
    socket = new WebSocket("wss://{{host}}:{{webPort}}");

    socket.onopen = function(e) {
      console.debug("[open] Connection established");

      if (clientKey && clientCert && !clientAuth) {
        auth(clientKey, clientCert);
      }
    };

    socket.onmessage = function(event) {
      console.debug(`[message] Data received from server: ${event.data}`);

      if (clientAuth) {
        $(document).find('pre').append(event.data);
        scroll();
      } else if (/^PUBLIC_KEY=/.test(event.data)) {
        const PUBLIC_KEY = window.atob(event.data.replace(/^PUBLIC_KEY=/, ''));

        localStorage.setItem('PUBLIC_KEY', PUBLIC_KEY);

        // alert('PUBLIC_KEY: \n' + PUBLIC_KEY);

        importRsaKey(PUBLIC_KEY).then((pubKey) => {
          publicKey = pubKey;
          console.log('Imported public key', pubKey);
        }).catch(console.error);
      } else {
        $('#message').html(event.data);
        const msg = $('#message').text().trim();

        console.log('PRE AUTH MSG', msg);

        if (/^Authorized: (.*)$/.test(msg)) {
          console.log('Authorized!');
          clientAuth = msg;
          $('#console').show();
        } else {
          console.warn('Unauthorized:', msg);
        }
      }
    };

    socket.onclose = function(event) {
      exit();

      if (event.wasClean) {
        console.debug(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.debug('[close] Connection died');
      }
    };

    socket.onerror = function(error) {
      console.debug(`[error] ${error.message}`);
    };
  }

  function send(msg, plain = false) {
    console.log('Sending msg to socket', msg);

    if (plain) {
      socket.send(msg);
    } else {
      encryptMessage(msg).then((data) => {
        console.log('Message encrypted:', data);
        socket.send(data);
      }).catch(console.error);
    }

    socket.send(msg);
  }

  function auth(key, cert) {
    if (!socket) return connect();

    clientKey = key;
    clientCert = cert;

    console.log('Auth with', {
      clientKey,
      clientCert,
    });

    localStorage.setItem('clientKey', clientKey);
    localStorage.setItem('clientCert', clientCert);

    send(`auth:${window.btoa(clientKey)}:${window.btoa(clientCert)}`, true);
  }

  function exit() {
    socket = null;
    clientKey = null;
    clientCert = null;
    clientAuth = null;

    $('#console').hide();
  }

  connect();

  $(document).on('keyup', function(event) {
    // Bail unless clientAuth exists
    if (!clientAuth) return;

    switch (event.key) {
      case 'Alt':
      case 'Control':
      case 'Shift':
        console.debug('Ignoring keyup', event.key);
        break;
      case 'Enter':
        console.debug('Send cmd', buff.join(''));
        $(this).find('pre').append("\r\n");
        send(buff.join(''));
        // $.ajax({
        //   type: 'POST',
        //   url: '/test',
        //   data: JSON.stringify({ cmd: buff.join('') }),
        //   dataType: 'json',
        //   success: (resp) => {
        //     console.log('POST resp', resp);
        //   }
        // });
        buff = [];
        scroll();
        break;
      case 'Backspace':
        if (buff.length) {
          $(this).find('pre').html($(this).find('pre').html().slice(0, -1));
          buff.pop();
        }
        break;
      default:
        $(this).find('pre').append(event.key);
        buff.push(event.key);
        break;
    }
  });
});
