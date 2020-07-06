/**
 * WebSocket connections module.
 *
 * @version 1
 */
export default class Socket {
  constructor(address = '') {
    console.info(`[socket] connecting to [${address}]`);

    try {
      const connection = new WebSocket(address);

      connection.onopen = () => {
        console.info('[socket] connection open');
      };
      connection.onerror = (error) => console.error(`[socket] ${error}`);
      connection.onclose = () => console.info('[socket] closed');
      connection.onmessage = (response) => {
        console.log(response);
      };
    } catch (e) {
      console.error(`[socket] can't connect to [${address}]`);
    }
  }
}
