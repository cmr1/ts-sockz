$(function(){
  let buff = [];
  let socket = new WebSocket("wss://{{host}}:{{webPort}}");
  let clientKey, clientCert;

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

    console.log('Auth with', {
      clientKey,
      clientCert,
    });

    localStorage.setItem('clientKey', clientKey);
    localStorage.setItem('clientCert', clientCert);

    socket.send(`auth:${btoa(clientKey)}:${btoa(clientCert)}`);
  });

  function scroll() {
    var elem = document.getElementById('console');
    elem.scrollTop = elem.scrollHeight;
  }

  socket.onopen = function(e) {
    console.debug("[open] Connection established");
  };

  socket.onmessage = function(event) {
    console.debug(`[message] Data received from server: ${event.data}`);
    $(document).find('pre').append(event.data);
    scroll();
  };

  socket.onclose = function(event) {
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

  $(document).on('keyup', function(event) {
    // if (event.altKey || event.ctrlKey || event.shiftKey) {
    //   console.log('Handle modified keyup', event);
    // } else {
      switch (event.key) {
        case 'Alt':
        case 'Control':
        case 'Shift':
          console.debug('Ignoring keyup', event.key);
          break;
        case 'Enter':
          console.debug('Send cmd', buff.join(''));
          $(this).find('pre').append("\r\n");
          socket.send(buff.join(''));
          buff = [];
          scroll();
          break;
        case 'Backspace':
          $(this).find('pre').text($(this).find('pre').text().slice(0, -1));
          buff.pop();
          break;
        default:
          $(this).find('pre').append(event.key);
          buff.push(event.key);
          break;
      }
    // }
  });
});
