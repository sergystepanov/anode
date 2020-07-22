import { init, connect } from './webrtc';
import adapter from 'webrtc-adapter';

import Stream from './media/stream';

// setup:
//
// python -u ./simple_server.py --disable-ssl

function main() {
  console.info(
    `[webrtc] adapter: ${adapter.browserDetails.browser} ${adapter.browserDetails.version}`
  );

  const vid = Stream();
  const vEl = document.getElementById('player');
  vEl.append(vid.render());

  init(vid);
  connect();
}

main();
