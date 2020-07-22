import ws from './socket';

/**
 * Webrtc signalling module builder.
 *
 * @module network/signalling
 * @example
 *
 * const signalling = signallingBuilder(
 *    // factory: my-custom-factory-if-needed
 *  )
 *  .url('localhost-maybe')
 *  .onConnect((x) => console.log(x))
 *  .build();
 */
export default function signallingBuilder({ factory = websocketSignaling } = {}) {
  let url, onConnect, onClose, onError, onMessage, onOpen;

  return {
    url: function (address) {
      url = address;
      return this;
    },
    onConnect: function (callback) {
      onConnect = callback;
      return this;
    },
    onClose: function (callback) {
      onClose = callback;
      return this;
    },
    onError: function (callback) {
      onError = callback;
      return this;
    },
    onMessage: function (callback) {
      onMessage = callback;
      return this;
    },
    onOpen: function (callback) {
      onOpen = callback;
      return this;
    },
    /**
     * @returns {SignallingMod}
     */
    build: function () {
      return factory({
        url,
        onConnect,
        onClose,
        onError,
        onMessage,
        onOpen,
      });
    },
  };
}

function websocketSignaling({
  url = getDefaultWebsocketAddress(),
  onConnect,
  onClose,
  onError,
  onMessage,
  onOpen,
} = {}) {
  /** @type {WebSocket} */
  let connection;

  // !to add error handling
  const _encode = (data) => JSON.stringify(data);

  const connect = function () {
    console.debug(`[signal] connecting to ${url}`);

    connection = ws({
      address: url,
      onClose,
      onError,
      onMessage,
      onOpen,
    });

    onConnect(this);

    return connection;
  };

  /**
   * Returns signalling server url.
   * @returns {string}
   */
  const getUrl = () => url;

  /**
   * Sends data into signalling server.
   */
  const send = () => {
    return {
      raw: (data) => {
        connection?.send(data);
      },
      encoded: (data) => {
        connection?.send(_encode(data));
      },
    };
  };

  const close = () => {
    connection?.close();
  };

  return Object.freeze({
    connect,
    close,
    getUrl,
    send,
  });
}

function getDefaultWebsocketAddress() {
  const requestProtocol = window.location.protocol;

  const { proto, addr } = requestProtocol.startsWith('file')
    ? { proto: 'ws', addr: '127.0.0.1' }
    : requestProtocol.startsWith('http')
    ? { proto: 'ws', addr: window.location.hostname }
    : requestProtocol.startsWith('https')
    ? { proto: 'wss', addr: window.location.hostname }
    : {};

  const address = `${proto}://${addr}:8443`;

  if (!proto || !addr) throw new Error(`Bad connection address: ${address}`);

  return address;
}
