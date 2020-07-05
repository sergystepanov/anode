use actix_files::Files;
use actix_web::{middleware, App, HttpServer};

// async fn index(req: HttpRequest) -> &'static str {
// println!("REQ: {:?}", req);
// "Hello world!"
// }

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    HttpServer::new(|| {
        App::new()
            // Enable the logger.
            .wrap(middleware::Logger::default())
            // We allow the visitor to see an index of the images at `/images`.
            .service(Files::new("/images", "static/images/").show_files_listing())
            // Serve a tree of static files at the web root and specify the index file.
            // Note that the root path should always be defined as the last item. The paths are
            // resolved in the order they are defined. If this would be placed before the `/images`
            // path then the service for the static images would never be reached.
            .service(Files::new("/", "./static/root/").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
// #[actix_rt::main]
// async fn main() -> std::io::Result<()> {
//     std::env::set_var("RUST_LOG", "actix_web=info");
//     env_logger::init();

//     HttpServer::new(|| {
//         App::new()
//             // enable logger
//             .wrap(middleware::Logger::default())
//             .service(web::resource("/index.html").to(|| async { "Hello world!" }))
//             .service(web::resource("/").to(index))
//     })
//         .bind("127.0.0.1:8080")?
//         .run()
//         .await
// }

#[cfg(test)]
mod tests {
    use actix_web::dev::Service;
    use actix_web::{http, test, web, App, Error};

    use super::*;

    #[actix_rt::test]
    async fn test_index() -> Result<(), Error> {
        let app = App::new().route("/", web::get().to(index));
        let mut app = test::init_service(app).await;

        let req = test::TestRequest::get().uri("/").to_request();
        let resp = app.call(req).await.unwrap();

        assert_eq!(resp.status(), http::StatusCode::OK);

        let response_body = match resp.response().body().as_ref() {
            Some(actix_web::body::Body::Bytes(bytes)) => bytes,
            _ => panic!("Response error"),
        };

        assert_eq!(response_body, r##"Hello world!"##);

        Ok(())
    }
}
