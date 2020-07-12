import { event_ as events, EVENT_ERROR } from './event/event';
import socket_ from './network/socket';
import rtc from './network/rtc';

// Set this to use a specific peer id instead of a random one
var default_peer_id = 6088;
// Set this to override the automatic detection in websocketServerConnect()
var ws_server;
var ws_port;
var ws_conn;
var peer_connection;

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
}

function onLocalDescription_(connection, desc) {
  // Local description was set, send it to peer
  console.log(`Got local description: ${JSON.stringify(desc)}`);

  connection.setLocalDescription(desc).then(function () {
    setStatus(`Sending SDP ${desc.type}`);
    sdp = { sdp: connection.localDescription };
    ws_conn.send(JSON.stringify(sdp));
  });
}

function onServerMessage(event) {
  switch (event.data) {
    case 'HELLO':
      setStatus('Registered with server, waiting for call');
      return;
    default:
      if (event.data === undefined) return;

      const isString = Object.prototype.toString.call(event.data) === '[object String]';

      if (isString && event.data.startsWith('ERROR')) {
        handleIncomingError(event.data);
        return;
      }

      const rtc_ = rtc(
        (event) => {
          ws_conn.send(JSON.stringify({ ice: event.candidate }));
        },
        (event) => {
          if (getVideoElement().srcObject !== event.streams[0]) {
            console.log('Incoming stream');
            getVideoElement().srcObject = event.streams[0];
          }
        }
      );

      if (isString && event.data.startsWith('OFFER_REQUEST')) {
        // The peer wants us to set up and then send an offer
        if (!peer_connection) {
          rtc_.createCall(null).then(() => {
            peer_connection = rtc_.peerConnection;
            rtc_.offer(
              (desc) => {
                onLocalDescription_(peer_connection, desc);
              },
              (err) => {
                setError(err);
              }
            );
          });
        }
      } else {
        let msg;
        //Handle incoming JSON SDP and ICE messages
        try {
          msg = JSON.parse(event.data);
        } catch (e) {
          handleIncomingError(
            e instanceof SyntaxError
              ? `Error parsing incoming JSON: ${event.data}`
              : `Unknown error parsing response: ${event.data}`
          );
          return;
        }

        // Incoming JSON signals the beginning of a call
        if (!peer_connection) {
          rtc_.createCall(msg);
          peer_connection = rtc_.peerConnection;

          if (msg.sdp != null) {
            onIncomingSDP(peer_connection, msg.sdp, rtc_.localStreamPromise);
          } else if (msg.ice != null) {
            onIncomingICE(msg.ice, rtc_.peerConnection);
          } else {
            handleIncomingError(`Unknown incoming JSON: ${msg}`);
          }
        }
      }
  }
}

// SDP offer received from peer, set remote description and create an answer
function onIncomingSDP(connection, sdp, localStreamPromise, onLocalDescription) {
  connection
    .setRemoteDescription(sdp)
    .then(() => {
      setStatus('Remote SDP set');
      if (sdp.type != 'offer') return;
      setStatus('Got SDP offer');
      localStreamPromise
        .then((stream) => {
          setStatus('Got local stream, creating answer');
          connection
            .createAnswer()
            .then((desc) => {
              onLocalDescription_(peer_connection, desc);
            })
            .catch(setError);
        })
        .catch(setError);
    })
    .catch(setError);
}

// ICE candidate received from peer, add it to the peer connection
function onIncomingICE(ice, connection) {
  connection.addIceCandidate(new RTCIceCandidate(ice)).catch(setError);
}

function handleIncomingError(error) {
  setError('ERROR: ' + error);
  ws_conn.close();
}

function setError(text) {
  console.error(text);
}

function onServerClose() {
  setStatus('Disconnected from server');
  // resetVideo();

  // if (peer_connection) {
  //   peer_connection.close();
  //   peer_connection = null;
  // }
}
