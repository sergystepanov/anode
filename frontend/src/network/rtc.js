const rtc_configuration = Object.freeze({
  iceServers: [
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
});
// The default constraints that will be attempted. Can be overridden by the user.
var default_constraints = { video: true, audio: true };
// connection constraints
const constraints = default_constraints;
//JSON.stringify(default_constraints);

export default function (onIceCandidate = (event) => {}, onRemoteTrack = (event) => {}) {
  let connection;
  let local_stream_promise;

  const createCall = (msg) => {
    console.log('[rtc] creating RTCPeerConnection');
    // Reset connection attempts because we connected successfully
    // connect_attempts = 0;

    connection = new RTCPeerConnection(rtc_configuration);
    let send_channel = connection.createDataChannel('label', null);
    // send_channel.onopen = handleDataChannelOpen;
    // send_channel.onmessage = handleDataChannelMessageReceived;
    // send_channel.onerror = handleDataChannelError;
    // send_channel.onclose = handleDataChannelClose;
    // connection.ondatachannel = onDataChannel;
    connection.ontrack = onRemoteTrack;

    /* Send our video/audio to the other peer */
    local_stream_promise = getLocalStream()
      .then((stream) => {
        console.log('Adding local stream');
        connection.addStream(stream);
        return stream;
      })
      .catch(setError);

    if (msg != null && !msg.sdp) {
      console.log("WARNING: First message wasn't an SDP message!?");
    }

    connection.onicecandidate = (event) => {
      // We have a candidate, send it to the remote party with the
      // same uuid
      if (event.candidate == null) {
        console.log('ICE Candidate was null, done');
        return;
      }
      onIceCandidate(event);
    };

    if (msg != null) setStatus('Created peer connection for call, waiting for SDP');

    return local_stream_promise;
  };

  function getLocalStream() {
    // Add local stream
    if (navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    } else {
      console.error("Browser doesn't support getUserMedia!");
    }
  }

  function setError(text) {
    console.error(text);
  }

  function setStatus(text) {
    console.log(text);
  }

  const offer = (onLocalDescription = (desc) => {}, onError = (err) => {}) => {
    connection.createOffer().then(onLocalDescription).catch(onError);
  };

  return Object.freeze({
    createCall,
    offer,
    localStreamPromise: () => local_stream_promise,
    peerConnection: () => connection,
  });
}
