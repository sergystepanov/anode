import adapter from 'webrtc-adapter';
import webrtc from './network/webrtc';
import userStream from './media/user';

import { setError, setStatus, clearError, showPeerId } from './ui/ui';

import Stream from './media/stream';

// setup:
//
// python -u ./simple_server.py --disable-ssl
// --peer-id=1 --server=ws://127.0.0.1:8443

// Set this to use a specific peer id instead of a random one
var default_peer_id = 101;

/** @type Stream */
var vid;
/** @type webrtc */
var rtc;
let localStream;

const newId = () => Math.floor(Math.random() * (9000 - 10) + 10).toString();

function main() {
  console.info(
    `[webrtc] adapter: ${adapter.browserDetails.browser} ${adapter.browserDetails.version}`
  );

  vid = Stream();
  const vEl = document.getElementById('player');
  vEl.append(vid.render());

  rtc = webrtc({
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

function onServerOpen(event) {
  const peer_id = default_peer_id ?? newId();
  rtc.signalling?.send().raw(`HELLO ${peer_id}`);
  showPeerId(peer_id);
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
