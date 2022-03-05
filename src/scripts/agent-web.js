$(function(){
  let buff = [];

  let socket = new WebSocket("ws://localhost:8080");

  socket.onopen = function(e) {
    console.log("[open] Connection established");
    console.log("Sending to server");
    socket.send("My name is John");
  };

  socket.onmessage = function(event) {
    console.log(`[message] Data received from server: ${event.data}`);
  };

  socket.onclose = function(event) {
    if (event.wasClean) {
      console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log('[close] Connection died');
    }
  };

  socket.onerror = function(error) {
    console.log(`[error] ${error.message}`);
  };

  $(document).on('keyup', function(event) {
    // console.log('Key Up', event.key);

    // if (event.altKey || event.ctrlKey || event.shiftKey) {
    //   console.log('Handle modified keyup', event);
    // } else {
      switch (event.key) {
        case 'Alt':
        case 'Control':
        case 'Shift':
          console.log('Ignoring keyup', event.key);
          break;
        case 'Enter':
          console.log('Send cmd', buff.join(''));

          $.ajax({
            type: 'POST',
            url: '/post',
            data: JSON.stringify({ cmd: buff.join('') }),
            dataType: 'json',
            success: function(resp) {
              console.log('POST resp', resp);
            }
          }).done(function (data) {
            console.log('CMD SENT', data);
          }).fail(function(data) {
            console.log('CMD FAILED', data)
          }).always(function(data) {
            console.log('ALWAYS', data);
            $(this).find('pre').append(`\n$ `);
            buff = [];
          });

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
