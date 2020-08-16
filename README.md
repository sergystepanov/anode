# anode
<img src="https://github.com/sergystepanov/anode/workflows/Rust/badge.svg" alt="build status"> <img src="https://github.com/sergystepanov/anode/workflows/Frontend%20CI/badge.svg" alt="frontend build status">
A simple network streamer writen in Rust and JS.

### Run

Backend:
```shell
cargo run
```

Frontend:
```shell
npm start --prefix frontend watch
```

### Issues

Firefox `localhost` address won't allow to exchange ICE candidates, use `127.0.0.1` instead.
