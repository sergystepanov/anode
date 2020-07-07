/**
 * WebSocket connections module.
 *
 * @version 1
 */
export default function socket(address = '') {
  const messages = [];
  let opened = false;

  console.info(`[socket] connecting to [${address}]`);

  const connection = new WebSocket(address);
  connection.bufferType = 'arraybuffer';

  connection.onopen = () => {
    console.info('[socket] connection open');
    opened = true;

    console.info(`[socket] there are ${messages.length} messages in queue`);

    let message;
    while ((message = messages.pop())) {
      connection.send(message);
    }
  };
  connection.onerror = (error) => console.error(`[socket] ${error}`);
  connection.onclose = () => console.info('[socket] closed');
  connection.onmessage = (response) => {
    console.log(response);
  };

  const send = (text) => {
    if (!opened) {
      messages.push(text);
    } else {
      connection.send(text);
    }
  };

  return {
    send,
  };
}
