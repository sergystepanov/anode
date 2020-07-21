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
export default function webrtc(
  opts = {
    rtc: {
      iceServers: [
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.stunprotocol.org' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    },
  }
) {
  let connection;

  const connect = () => {
    connection = new RTCPeerConnection(opts.rtc);
  };

  const getConnection = () => connection;

  return {
    connect,
    getConnection,
  };
}

export function builder() {
  return {
    withSignaling: function () {
      return this;
    },
    build: function () {
      return webrtc();
    },
  };
}
