use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Store {
    id: String,
    name: String,
}

async fn get_stores() -> Json<Vec<Store>> {
    Json(vec![Store {
        id: "id".to_string(),
        name: "name".to_string(),
    }])
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/stores", get(get_stores));
    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
