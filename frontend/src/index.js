import Socket from './network/socket';

const address =
  ((window.location.protocol == 'https:' && 'wss://') || 'ws://') + window.location.host + '/ws/';

const ws = Socket(address);

ws.send('a');
ws.send('b');
ws.send('c');
ws.send('d');

let buffer = new ArrayBuffer(16);
let view = new Uint32Array(buffer);
view[0] = 123456;

ws.send(view);
