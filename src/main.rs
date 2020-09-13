use log::{debug, info};
use actix::prelude::*;
use actix_files as fs;
use actix_web::{middleware, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use std::{time::{Duration, Instant}, net};
use api::message::parse as explode;

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
        address: peer_address
    };

    return ws::start(connection, &r, stream);
}
/// websocket connection is long running connection, it easier
/// to handle with an actor
#[derive(Debug)]
struct Connection {
    hb: Instant,
    address: net::SocketAddr
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

#[actix_rt::main]
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

// #[cfg(test)]
// mod tests {
//     use actix_web::dev::Service;
//     use actix_web::{http, test, web, App, Error};

//     use super::*;

//     #[actix_rt::test]
//     async fn test_index() -> Result<(), Error> {
//         let app = App::new().route("/", web::get().to(index));
//         let mut app = test::init_service(app).await;

//         let req = test::TestRequest::get().uri("/").to_request();
//         let resp = app.call(req).await.unwrap();

//         assert_eq!(resp.status(), http::StatusCode::OK);

//         let response_body = match resp.response().body().as_ref() {
//             Some(actix_web::body::Body::Bytes(bytes)) => bytes,
//             _ => panic!("Response error"),
//         };

//         assert_eq!(response_body, r##"Hello world!"##);

//         Ok(())
//     }
// }
