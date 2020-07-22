import signallingBuilder from './signalling';

/**
 * Webrtc module based on RTCPeerConnection element.
 *
 * Contains a wrapper for RTCPeerConnection element
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection}.
 *
 * @module network/webrtc
 * @example
 *
 * import WebRTC from './network/webrtc'
 *
 * const w = WebRTC();
 *
 */
export default function webrtc({
  reconnects = 3,
  peerId = 100,
  rtc = {
    iceServers: [
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.stunprotocol.org' },
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  },
  onPrepare,
  onPrepareFail,
  onConnect,
  onClose,
  onError,
  onMessage,
  onOpen,
} = {}) {
  let attempts = 0;
  let connection;
  let reconnect;

  let signalling = signallingBuilder()
    .onConnect((signalling) => {
      reconnect = false;
      onConnect?.(signalling);
    })
    .onError((event) => {
      onError?.(event);
      if (!reconnect) reconnect = setTimeout(prepare, 3000);
    })
    .onClose((event) => {
      onClose?.(event);
      connection?.close();
      connection = undefined;
      if (!reconnect) reconnect = setTimeout(prepare, 1000);
    })
    .onMessage((message) => {
      onMessage?.(message);
    })
    .onOpen((event) => {
      let peer_id = peerId ?? getOurId();
      signalling?.send().raw(`HELLO ${peer_id}`);
      onOpen?.(peer_id);
    })
    .build();

  const connect = () => {
    attempts = 0;
    connection = new RTCPeerConnection(rtc);
  };
  /**
   * @returns {RTCPeerConnection}
   */
  const getConnection = () => connection;

  function prepare() {
    onPrepare?.();

    if (signalling) {
      if (++attempts > reconnects) {
        onPrepareFail?.();
        return;
      }

      signalling?.connect();
    }
  }

  const shutdown = () => {
    signaling?.close();
  };

  return Object.freeze({
    connect,
    signalling,
    getConnection,
    prepare,
    shutdown,
  });
}

function getOurId() {
  return Math.floor(Math.random() * (9000 - 10) + 10).toString();
}
