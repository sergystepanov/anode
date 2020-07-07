/**
 * WebSocket connections module.
 *
 * @param {string} address A WebSocket address value.
 * @example <caption>Example usage of socket module.</caption>
 *
 * import {Socket} from './socket'
 *
 * const conn = Socket('ws://localhost:1234/ws');
 * conn.send('test');
 *
 */
export default function socket(address = '') {
  const messages = [];

  console.info(`[socket] connecting to [${address}]`);

  const conn = new WebSocket(address);
  conn.binaryType = 'arraybuffer';

  conn.onopen = () => {
    console.info('[socket] connection open');
    console.info(`[socket] there are ${messages.length} messages in queue`);

    let message;
    while ((message = messages.pop())) {
      conn.send(message);
    }
  };
  conn.onerror = (error) => console.error(`[socket] ${error}`);
  conn.onclose = () => console.info('[socket] closed');
  conn.onmessage = (response) => {
    console.log(response);
  };

  /**
   * Sends a message into the socket.
   * @param {string | ArrayBuffer} data Some data value to send into the socket.
   */
  const send = (data) => {
    if (conn.readyState !== WS_STATE.OPEN) {
      messages.push(data);
    } else {
      conn.send(data);
    }
  };

  return {
    send,
  };
}

// socket states
const WS_STATE = Object.freeze({
  // Socket has been created. The connection is not yet open.
  CONNECTING: 0,
  // The connection is open and ready to communicate.
  OPEN: 1,
  // The connection is in the process of closing.
  CLOSING: 2,
  // The connection is closed or couldn't be opened.
  CLOSED: 3,
});
