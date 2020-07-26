import adapter from 'webrtc-adapter';
import webrtc from './network/webrtc';
import userStream from './media/user';

import { setError, setStatus, clearError, showPeerId } from './ui/ui';

import Stream from './media/stream';

// setup:
//
// python -u ./simple_server.py --disable-ssl

// Set this to use a specific peer id instead of a random one
var default_peer_id = 101;

/** @type Stream */
var vid;
/** @type webrtc */
var rtc;
let localStream;

function main() {
  console.info(
    `[webrtc] adapter: ${adapter.browserDetails.browser} ${adapter.browserDetails.version}`
  );

  vid = Stream();
  const vEl = document.getElementById('player');
  vEl.append(vid.render());

  rtc = webrtc({
    address: `ws://${window.location.host}/ws/`,
    peerId: default_peer_id,
    onConnect: onServerConnect,
    onPrepare: onServerPrepare,
    onPrepareFail: () => {
      setError('Too many connection attempts, aborting. Refresh page to try again');
    },
    onError: () => {
      setError("Couldn't connect to server");
    },
    onClose: onServerClose,
    onOpen: onServerOpen,
    onRemoteTrack,
  });

  localStream = userStream({
    onNotSupported: errorUserMediaHandler,
    onError: setError,
  });

  rtc.prepare();
  // setTimeout(() => {
  //   rtc.testMessage();
  // }, 10000);
}

main();

function resetVideo() {
  localStream?.stop();
  vid.reset();
}

function onServerConnect(sig) {
  setStatus(`[webrtc] connecting to server ${sig.getUrl()}`);
}

function onServerClose(event) {
  setStatus('Disconnected from server');
  resetVideo();
}

function onServerOpen(id) {
  showPeerId(id);
  setStatus('Registering with server');
}

function onServerPrepare() {
  clearError();
}

function onRemoteTrack(event) {
  vid.addSource(event.streams[0]);
}

function errorUserMediaHandler() {
  setError("Browser doesn't support getUserMedia!");
}
