export default function signalingBuilder() {
  let url;
  let onConnectCallback;
  let onCloseCallback;

  return {
    withURL: function (address) {
      url = address;
      return this;
    },
    withOnConnect: function (callback) {
      onConnectCallback = callback;
      return this;
    },
    withOnClose: function (callback) {
      onCloseCallback = callback;
      return this;
    },
    build: function () {
      return websocketSignaling(url, onConnectCallback, onCloseCallback);
    },
  };
}

function websocketSignaling(url, onConnect = () => {}, onCloseCallback) {
  /** @type {WebSocket} */
  let connection;
  let _url;

  // !to add error handling
  const _encode = (data) => JSON.stringify(data);

  const _getDefaultURL = () => {
    let ws_port = ws_port || '8443';
    let ws_server;
    if (window.location.protocol.startsWith('file')) {
      ws_server = ws_server || '127.0.0.1';
    } else if (window.location.protocol.startsWith('http')) {
      ws_server = ws_server || window.location.hostname;
    } else {
      throw new Error(
        "Don't know how to connect to the signalling server with uri" + window.location
      );
    }
    return `ws://${ws_server}:${ws_port}`;
  };

  const connect = function () {
    _url = url || _getDefaultURL();
    console.info(`[signal] connecting to ${_url}`);
    onConnect(this);

    connection = new WebSocket(_url);
    if (onCloseCallback) {
      connection.onclose = onCloseCallback;
    }
    return connection;
  };

  const getUrl = () => _url;

  const send = (data) => {
    connection.send(_encode(data));
  };

  return {
    connect,
    send,
    getUrl,
  };
}
