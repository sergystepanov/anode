use actix_files as fs;
use actix_web::{middleware::Logger, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_ws::Message;
use api::message::parse as explode;
use log::{debug, error, info};
use std::{
    collections::HashMap,
    net,
    time::{Duration, Instant},
};

mod api;

async fn ws(req: HttpRequest, body: web::Payload) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;

    let peer_address = req.peer_addr().unwrap();
    info!("[peer] {}", peer_address);

    actix_rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            debug!("[socket] ${:?}", msg);

            match msg {
                Message::Ping(bytes) => {
                    if session.pong(&bytes).await.is_err() {
                        return;
                    }
                }
                Message::Text(s) => {
                    let message = s.to_string();
                    let command = explode(&message);

                    match command {
                        Some(("HELLO", _)) => {
                            if session.text("HELLO").await.is_err() {
                                return;
                            }
                        }
                        Some(("SESSION", _)) => {
                            if session.text("SESSION_OK").await.is_err() {
                                return;
                            }
                        }
                        Some((_, _)) => {
                            if session.text(s).await.is_err() {
                                return;
                            }
                        }
                        None => {
                            if session.text(s).await.is_err() {
                                return;
                            }
                        }
                    }
                }
                _ => break,
            }
        }

        let _ = session.close(None).await;
    });

    Ok(response)
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

#[actix_web::main]
async fn main() -> Result<(), anyhow::Error> {
    std::env::set_var(
        "RUST_LOG",
        "actix_server=info,actix_web=info,actix_ws=debug,info,debug",
    );
    pretty_env_logger::init();

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .route("/ws/", web::get().to(ws))
            .service(fs::Files::new("/", "static/root/").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await?;

    Ok(())
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

// fn greetings(
//     command: &str,
//     value: &str,
//     mut connection: ws::WebsocketContext<Connection>,
// ) -> Option<String> {
//     if command != "HELLO" {
//         connection.close(Some(actix_web_actors::ws::CloseReason {
//             code: ws::CloseCode::Invalid,
//             description: Some("invalid protocol".to_string()),
//         }));
//         error!("Invalid greeting from peer {:?}", connection.address());
//         return None;
//     }

//     if value == "" {
//         connection.close(Some(actix_web_actors::ws::CloseReason {
//             code: ws::CloseCode::Invalid,
//             description: Some("invalid peer uid".to_string()),
//         }));
//         error!("Invalid uid {} from peer {:?}", value, connection.address());
//         return None;
//     }

//     connection.text("HELLO");

//     return Some(value.to_string());
// }
