import Socket from './network/socket';
import Video from './media/video';
import event from './event/event';
import EVENT_ERROR from './event/event';
import s from './server';

const root = document.getElementById('root');

let address = 'ws://localhost:8443/ws/';
// const address =
// ((window.location.protocol == 'https:' && 'wss://') || 'ws://') + window.location.host + '/ws/';

const vid = Video();
root.append(vid.render());

const server = s(address, vid);
server.connect();

// server.send('a');
// server.send('b');
// server.send('c');
// server.send('d');

// let buffer = new ArrayBuffer(16);
// let view = new Uint32Array(buffer);
// view[0] = 123456;

// server.send(view);

// event.on(EVENT_ERROR, (m) => console.error(m));

// event.on('lol', (m) => {
//   console.log(m);
// });

// event.emit('lol', 'a');
// event.emit('lol', 'b');
// event.emit('lol', 'c');
