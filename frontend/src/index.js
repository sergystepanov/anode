import { init, websocketServerConnect } from './webrtc';
import adapter from 'webrtc-adapter';

import Stream from './media/stream';
import { builder as WebRTC } from './network/webrtc';

function main() {
  console.info(
    `[webrtc] adapter: ${adapter.browserDetails.browser} ${adapter.browserDetails.version}`
  );

  const vid = Stream();
  const vEl = document.getElementById('player');
  vEl.append(vid.render());

  init(vid);
  websocketServerConnect();
}

main();
