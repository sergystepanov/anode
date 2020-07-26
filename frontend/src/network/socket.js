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
export default function ({ address = '', onOpen, onMessage, onError, onClose } = {}) {
  const messages = [];

  console.info(`[socket] connecting to [${address}]`);

  const conn = new WebSocket(address);
  conn.binaryType = 'arraybuffer';

  conn.onopen = () => {
    console.info('[socket] connection has been opened');
    console.debug(`[socket] there are ${messages.length} messages in queue`);

    let message;
    while ((message = messages.pop())) {
      send(message);
    }

    onOpen?.();
  };
  conn.onerror = (error) => {
    console.error(`[socket] fail`, error);
    onError?.(error);
  };
  conn.onclose = () => {
    console.debug('[socket] closed');
    onClose?.();
  };
  conn.onmessage = (response) => {
    console.debug(`[socket] received: ${response.data}`);
    onMessage?.(response);
  };

  /**
   * Sends a message into the socket.
   * @param {string | ArrayBuffer} data Some data value to send into the socket.
   */
  const send = (data) => {
    if (conn.readyState !== WS_STATE.OPEN) {
      messages.push(data);
    } else {
      console.debug(`[socket] sending: ${data}`);
      conn.send(data);
    }
  };

  const close = () => {
    conn?.close();
  };

  return Object.freeze({
    conn,
    send,
    close,
  });
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
