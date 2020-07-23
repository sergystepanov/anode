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
  onRemoteTrack,
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
    .onMessage((event) => {
      const message = event.data;
      console.debug(`[webrtc] got ${message}`);

      if (!message.startsWith('HELLO') && !message.startsWith('ERROR')) {
        if (event.data.startsWith('OFFER_REQUEST')) {
          // The peer wants us to set up and then send an offer
          callMeMaybe(null).then(generateOffer());
        } else {
          let msg;
          // Handle incoming JSON SDP and ICE messages
          try {
            msg = JSON.parse(event.data);
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.error(`JSON parse error: ${message}`);
            } else {
              console.error(`Unknown response ${message}`);
            }
            msg = undefined;
          }

          if (msg) {
            callMeMaybe(msg);

            if (msg.sdp != null) {
              onIncomingSDP(msg.sdp);
            } else if (msg.ice != null) {
              onIncomingICE(msg.ice);
            } else {
              console.warn(`Unknown incoming JSON: ${msg}`);
            }
          }
        }
      }

      onMessage?.(event);
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

    connection.onicecandidate = (event) => {
      if (event.candidate === null) {
        console.log('ICE Candidate was null, done');
        return;
      }

      signalling?.send().encoded({ ice: event.candidate });
    };

    if (onRemoteTrack) {
      connection.ontrack = onRemoteTrack;
    }
  };
  /**
   * @returns {RTCPeerConnection}
   */
  const getConnection = () => connection;

  function callMeMaybe(msg) {
    if (isActive()) return;

    console.info('[webrtc] setup peer connection');

    connect();
    // send_channel = peer_connection.createDataChannel('label', null);
    // send_channel.onopen = handleDataChannelOpen;
    // send_channel.onmessage = handleDataChannelMessageReceived;
    // send_channel.onerror = handleDataChannelError;
    // send_channel.onclose = handleDataChannelClose;
    // peer_connection.ondatachannel = onDataChannel;

    /* Send our video/audio to the other peer */

    // local_stream_promise = getLocalStream()
    //   .then((stream) => {
    //     console.log('Adding local stream');
    //     peer_connection.addStream(stream);
    //     return stream;
    //   })
    //   .catch(setError);

    if (msg != null && !msg.sdp) {
      console.log("WARNING: First message wasn't an SDP message!?");
    }

    if (msg != null) console.info('Created peer connection for call, waiting for SDP');

    // return local_stream_promise;
    return Promise.resolve();
  }

  // SDP offer received from peer, set remote description and create an answer
  function onIncomingSDP(sdp) {
    connection
      ?.setRemoteDescription(sdp)
      .then(() => {
        console.debug('Remote SDP set');
        if (sdp.type != 'offer') return;
        console.debug('Got SDP offer');
        connection.createAnswer().then(onLocalDescription).catch(onError);
        // + wait for a local stream
      })
      .catch(onError);
  }

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

  const isActive = () => !!connection;

  /**
   * Adds user stream into the WebRTC connection.
   * @param {*} stream
   */
  const addStream = (stream) => {
    connection?.addStream(stream);
  };

  function generateOffer() {
    connection?.createOffer().then(onLocalDescription).catch(onError);
  }

  // ICE candidate received from peer, add it to the peer connection
  function onIncomingICE(ice) {
    connection?.addIceCandidate(new RTCIceCandidate(ice)).catch((err) => {
      console.error(err);
      onError();
    });
  }

  // Local description was set, send it to peer
  function onLocalDescription(desc) {
    console.log('Got local description: ' + desc.sdp);

    // force stereo in Chrome
    // !to fix inf loop in Firefox
    // desc.sdp = addParamsToCodec(desc.sdp, 'opus', { 'sprop-stereo': 1, stereo: 1 });

    connection?.setLocalDescription(desc).then(function () {
      console.debug(`Sending SDP ${desc.type}`);
      signalling?.send().encoded({ sdp: connection.localDescription });
    });
  }

  return Object.freeze({
    isActive,
    connect,
    signalling,
    getConnection,
    prepare,
    shutdown,

    generateOffer,
    addStream,
  });
}

function getOurId() {
  return Math.floor(Math.random() * (9000 - 10) + 10).toString();
}
