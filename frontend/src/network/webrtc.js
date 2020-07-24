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
export default function ({
  reconnects = 3,
  peerId = 100,
  stopLocalIce = false,
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
  const state = Object.seal({
    connectionAttempts: 0,
    connectionState: '',
    localIceCompleted: false,
    iceConnectionState: '',
    iceGatheringState: '',
  });

  /** @type RTCPeerConnection */
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
      const m = event.data;
      console.debug(`[webrtc] got ${m}`);

      switch (m) {
        case m.startsWith('HELLO') ? m : '':
          console.info(`[webrtc] session is opened`);
          break;
        case m.startsWith('ERROR') ? m : '':
          onError?.(`ERROR: ${error}`);
          rtc?.shutdown();
          break;
        case m.startsWith('OFFER_REQUEST') ? m : '':
          // The peer wants us to set up and then send an offer
          callMeMaybe(null).then(createOffer);
          break;
        default:
          // Handle incoming JSON SDP and ICE messages
          let msg = fromJson(m);

          if (msg) {
            callMeMaybe(msg);

            if (msg.sdp != null) {
              onIncomingSDP(msg.sdp).catch(onError);
            } else if (msg.ice != null) {
              onRemoteIceCandidate(msg.ice).catch(onError);
            } else {
              console.warn(`[webrtc] unhandled message: ${msg}`);
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
    resetState();

    connection = new RTCPeerConnection(rtc);
    connection.onconnectionstatechange = _onConnectionStateChange;
    connection.ondatachannel = _onDataChannel;
    // make Trickle ICE (1)
    connection.onicecandidate = (event) => {
      if (!stopLocalIce && state.localIceCompleted) return;

      if (event.candidate === null) {
        state.localIceCompleted = true;
        console.log('[webrtc][ice] ICE gathering is complete');
        return;
      }
      console.debug(`[webrtc][ice] got ice`, event.candidate);

      signalling?.send().encoded({ ice: event.candidate });
    };
    connection.oniceconnectionstatechange = _onIceConnectionStateChange;
    connection.onicegatheringstatechange = _onIceGatheringStateChange;

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
  async function onIncomingSDP(sdp) {
    await connection?.setRemoteDescription(sdp);
    console.debug('[webrtc] remote SDP set');
    if (sdp.type !== 'offer') return;

    console.debug('[webrtc] got SDP offer');
    const answer = await connection?.createAnswer();
    onLocalDescription(answer);
    // + wait for a local stream
  }

  function prepare() {
    onPrepare?.();

    if (signalling) {
      if (++state.connectionAttempts > reconnects) {
        onPrepareFail?.();
        return;
      }

      signalling?.connect();
    }
  }

  const shutdown = () => {
    state.connectionState = '';
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

  async function createOffer() {
    const sdp = await connection?.createOffer();
    onLocalDescription(sdp);
  }

  // make Trickle ICE (2)
  async function onRemoteIceCandidate(ice) {
    console.debug(`[webrtc][ice] received ice`, ice);
    await connection?.addIceCandidate(new RTCIceCandidate(ice));
  }

  // Local description was set, send it to peer
  async function onLocalDescription(desc) {
    console.log(`[webrtc] got local SDP`);

    // force stereo in Chrome
    // !to fix inf loop in Firefox
    // desc.sdp = addParamsToCodec(desc.sdp, 'opus', { 'sprop-stereo': 1, stereo: 1 });

    connection?.setLocalDescription(desc).then(() => {
      console.debug(`[webrtc] sending SDP ${desc.type}`);
      signalling?.send().encoded({ sdp: connection.localDescription });
    });
  }

  /**
   * This happens whenever the aggregate state of the connection changes.
   */
  function _onConnectionStateChange() {
    console.debug(
      `[webrtc] connection state change [${state.connectionState}] -> [${connection.connectionState}]`
    );
    state.connectionState = connection.connectionState;
  }

  function _onIceConnectionStateChange() {
    console.debug(
      `[webrtc][ice] ICE connection state change [${state.iceConnectionState}] -> [${connection.iceConnectionState}]`
    );
    state.iceConnectionState = connection.iceConnectionState;
  }

  function _onIceGatheringStateChange() {
    console.debug(
      `[webrtc][ice] ICE gathering state change [${state.iceGatheringState}] -> [${connection.iceGatheringState}]`
    );
    state.iceGatheringState = connection.iceGatheringState;
  }

  /**
   * This event, of type RTCDataChannelEvent, is sent when an RTCDataChannel
   * is added to the connection by the remote peer calling createDataChannel().
   *
   * @param {RTCDataChannelEvent} event
   */
  function _onDataChannel(event) {}

  function resetState() {
    state.connectionAttempts = 0;
    state.localIceCompleted = false;
    state.iceConnectionState = '';
    state.iceGatheringState = '';
    state.connectionState = '';
  }

  return Object.freeze({
    isActive,
    connect,
    signalling,
    getConnection,
    prepare,
    shutdown,
    addStream,
  });
}

function getOurId() {
  return Math.floor(Math.random() * (9000 - 10) + 10).toString();
}

function fromJson(data) {
  let result;
  try {
    result = JSON.parse(data);
  } catch (e) {
    console.error(`Non-parsable JSON ${data}`);
  }

  return result;
}
