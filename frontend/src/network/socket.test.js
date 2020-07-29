import Socket, { STATE } from './socket';

// an uber mocking socket proxy
let testSocketImpl = ({
  send = () => {},
  close = function () {
    this.readyState = STATE.CLOSING;
    this.onclose();
    this.readyState = STATE.CLOSED;
  },
} = {}) => {
  return function (address) {
    return new Proxy(
      {
        send,
        close,
      },
      {
        set: function (target, key, value) {
          target[key] = value;
          if (key === 'onopen') {
            target.onopen();
            target.readyState = STATE.OPEN;
          }
          return true;
        },
      }
    );
  };
};

test('if the socket is initialized', () => {
  // re-mock
  const customMock = testSocketImpl({
    send: (message) => console.log(message, 'YOLO'),
  });
  const socket = Socket({
    socket: customMock,
    address: 'it_is://a-test',
  });
  socket.send('test');
  socket.close();

  expect(socket).toBeDefined();
});
