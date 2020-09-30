use actix::prelude::*;
use actix_files as fs;
use actix_web::{middleware, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use api::message::parse as explode;
use log::{debug, error, info};
use std::{
    collections::HashMap,
    net,
    time::{Duration, Instant},
};

mod api;

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

async fn ws_index(r: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let peer_address = r.peer_addr().unwrap();
    info!("[peer] {}", peer_address);

    let connection = Connection {
        hb: Instant::now(),
        address: peer_address,
    };

    return ws::start(connection, &r, stream);
}

// Describes application network state, peer connections
#[derive(Debug)]
struct Network {
    // A bi-map between peers
    // {uid_1: uid_2, uid_2: uid_1 ...}
    sessions: HashMap<String, String>,
}

/// websocket connection is long running connection, it easier
/// to handle with an actor
#[derive(Debug)]
struct Connection {
    hb: Instant,
    address: net::SocketAddr,
}

impl Actor for Connection {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start. We start the heartbeat process here.
    fn started(&mut self, ctx: &mut Self::Context) {
        self.hb(ctx);
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for Connection {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, conn: &mut Self::Context) {
        debug!("[socket] ${:?}", msg);

        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.hb = Instant::now();
                conn.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                let message = text.to_string();
                let command = explode(&message);

                match command {
                    Some(("HELLO", _)) => conn.text("HELLO"),
                    Some(("SESSION", _)) => conn.text("SESSION_OK"),
                    Some((_, _)) => conn.text(text),
                    None => conn.text(text),
                }
            }
            Ok(ws::Message::Binary(bin)) => conn.binary(bin),
            Ok(ws::Message::Close(reason)) => {
                conn.close(reason);
                conn.stop();
            }
            _ => conn.stop(),
        }
    }
}

impl Connection {
    /// helper method that sends ping to client every second.
    ///
    /// also this method checks heartbeats from client
    fn hb(&self, ctx: &mut <Self as Actor>::Context) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, conn| {
            // check client heartbeats
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                println!("Websocket Client heartbeat failed, disconnecting!");
                conn.stop();
                return;
            }

            conn.ping(b"");
        });
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_server=info,actix_web=info,info,debug");
    env_logger::init();

    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            // websocket endpoint
            .service(web::resource("/ws/").route(web::get().to(ws_index)))
            // frontend endpoint
            .service(fs::Files::new("/", "static/root/").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

// async def hello_peer(self, ws):
//     '''
//     Exchange hello, register peer
//     '''
//     raddr = ws.remote_address
//     hello = await ws.recv()
//     hello, uid = hello.split(maxsplit=1)
//     if hello != 'HELLO':
//         await ws.close(code=1002, reason='invalid protocol')
//         raise Exception("Invalid hello from {!r}".format(raddr))
//     if not uid or uid in self.peers or uid.split() != [uid]: # no whitespace
//         await ws.close(code=1002, reason='invalid peer uid')
//         raise Exception("Invalid uid {!r} from {!r}".format(uid, raddr))
//     # Send back a HELLO
//     await ws.send('HELLO')
//     return uid

fn greetings(
    command: &str,
    value: &str,
    mut connection: ws::WebsocketContext<Connection>,
) -> Option<String> {
    if command != "HELLO" {
        connection.close(Some(actix_web_actors::ws::CloseReason {
            code: ws::CloseCode::Invalid,
            description: Some("invalid protocol".to_string()),
        }));
        error!("Invalid greeting from peer {:?}", connection.address());
        return None;
    }

    if value == "" {
        connection.close(Some(actix_web_actors::ws::CloseReason {
            code: ws::CloseCode::Invalid,
            description: Some("invalid peer uid".to_string()),
        }));
        error!("Invalid uid {} from peer {:?}", value, connection.address());
        return None;
    }

    connection.text("HELLO");

    return Some(value.to_string());
}
