import { event_ as events, EVENT_ERROR } from './event/event';
import socket_ from './network/socket';

// The default constraints that will be attempted. Can be overridden by the user.
var default_constraints = { video: true, audio: true };
// Set this to use a specific peer id instead of a random one
var default_peer_id;
// Set this to override the automatic detection in websocketServerConnect()
var ws_server;
var ws_port;
var ws_conn;

/**
 * Server module.
 *
 */
export default function (
  address = '',
  config = {
    attempts: 10,
  }
) {
  let tries = 0;

  let socket;

  // function websocketServerConnect()
  const connect = () => {
    tries++;

    if (tries > config.attempts) {
      events.emit(EVENT_ERROR, 'Too many connection attempts, aborting. Refresh page to try again');
      tries = 0;
      return;
    }

    // connection constraints
    const constraints = JSON.stringify(default_constraints);
    // get connection id
    const peer_id = default_peer_id || genId();
    ws_port = ws_port || '8443';

    if (window.location.protocol.startsWith('file')) {
      ws_server = ws_server || '127.0.0.1';
    } else if (window.location.protocol.startsWith('http')) {
      ws_server = ws_server || window.location.hostname;
    } else {
      throw new Error(
        "Don't know how to connect to the signalling server with uri" + window.location
      );
    }

    socket = socket_(
      address || `wss://${ws_server}:${ws_port}`,
      () => {
        // document.getElementById('peer-id').textContent = peer_id;
        socket.send(`HELLO ${peer_id}`);
        setStatus('Registering with server');
      },
      (message) => {
        onServerMessage(message);
      },
      (error) => {
        onServerError(error);
      },
      () => {
        onServerClose();
      }
    );
    ws_conn = socket.conn;
  };

  const send = (message) => {
    if (socket) socket.send(message);
  };

  return {
    connect,
    send,
  };
}

function genId() {
  return Math.floor(Math.random() * (9000 - 10) + 10).toString();
}

function setStatus(text) {
  console.log(text);
}

function onServerError() {
  setError('Unable to connect to server, did you add an exception for the certificate?');
  // Retry after 3 seconds
  // window.setTimeout(websocketServerConnect, 3000);
}

function onServerMessage(event) {
  console.log('Received ' + event.data);
  switch (event.data) {
    case 'HELLO':
      setStatus('Registered with server, waiting for call');
      return;
    default:
    // if (event.data && event.data.startsWith('ERROR')) {
    //   handleIncomingError(event.data);
    //   return;
    // }
    // if (event.data && event.data.startsWith('OFFER_REQUEST')) {
    //   // The peer wants us to set up and then send an offer
    //   if (!peer_connection) createCall(null).then(generateOffer);
    // } else {
    // Handle incoming JSON SDP and ICE messages
    // try {
    //   msg = JSON.parse(event.data);
    // } catch (e) {
    //   if (e instanceof SyntaxError) {
    //     handleIncomingError('Error parsing incoming JSON: ' + event.data);
    //   } else {
    //     handleIncomingError('Unknown error parsing response: ' + event.data);
    //   }
    //   return;
    // }
    // // Incoming JSON signals the beginning of a call
    // if (!peer_connection) createCall(msg);
    // if (msg.sdp != null) {
    //   onIncomingSDP(msg.sdp);
    // } else if (msg.ice != null) {
    //   onIncomingICE(msg.ice);
    // } else {
    //   handleIncomingError('Unknown incoming JSON: ' + msg);
    // }
    // }
  }
}

function onServerClose() {
  setStatus('Disconnected from server');
  // resetVideo();

  // if (peer_connection) {
  //   peer_connection.close();
  //   peer_connection = null;
  // }

  // // Reset after a second
  // window.setTimeout(websocketServerConnect, 1000);
}
