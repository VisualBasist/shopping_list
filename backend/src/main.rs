use axum::{
    extract::{Path, State},
    http::{HeaderValue, StatusCode},
    routing::{get, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Serialize, FromRow)]
struct Store {
    id: Uuid,
    name: String,
}

async fn get_stores(State(pool): State<PgPool>) -> Json<Vec<Store>> {
    Json(
        sqlx::query_as("SELECT * from stores")
            .fetch_all(&pool)
            .await
            // TODO: エラー処理
            .unwrap(),
    )
}

#[derive(Serialize, FromRow)]
struct Item {
    id: Uuid,
    name: String,
}

async fn get_items(State(pool): State<PgPool>) -> Json<Vec<Item>> {
    Json(
        sqlx::query_as("SELECT * from items")
            .fetch_all(&pool)
            .await
            // TODO: エラー処理
            .unwrap(),
    )
}

#[derive(Serialize, FromRow)]
struct StoreItem {
    id: Uuid,
    name: String,
    store_id: Uuid,
    is_done: bool,
    price: Option<f64>,
}

async fn get_store_items(
    Path(store_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Json<Vec<StoreItem>> {
    Json(
        sqlx::query_as("SELECT items.id, items.name, store_items.store_id, store_items.is_done, store_items.price FROM store_items JOIN items ON items.id = store_items.item_id WHERE store_id = $1")
            .bind(store_id)
            .fetch_all(&pool)
            .await
            // TODO: エラー処理
            .unwrap(),
    )
}

#[derive(Deserialize)]
struct StoreItemStateRequest {
    is_done: bool,
}

async fn put_store_item_state(
    Path((store_id, item_id)): Path<(Uuid, Uuid)>,
    State(pool): State<PgPool>,
    Json(StoreItemStateRequest { is_done }): Json<StoreItemStateRequest>,
) -> StatusCode {
    sqlx::query("UPDATE store_items SET is_done = $1 WHERE store_id = $2 AND item_id = $3")
        .bind(is_done)
        .bind(store_id)
        .bind(item_id)
        .execute(&pool)
        .await
        .unwrap();
    StatusCode::NO_CONTENT
}

#[tokio::main]
async fn main() {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres@localhost/shopping_list")
        .await
        .expect("can't connect to database");

    let app = Router::new()
        .route("/stores", get(get_stores))
        .route("/items", get(get_items))
        .route("/stores/:store_id/items", get(get_store_items))
        .route(
            "/stores/:store_id/items/:item_id/state",
            put(put_store_item_state),
        )
        .layer(
            // TODO: 全てのパスで同じにしてしまってるので厳密に
            CorsLayer::new()
                .allow_methods([axum::http::Method::GET, axum::http::Method::PUT])
                .allow_headers([axum::http::header::CONTENT_TYPE])
                .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap()),
        )
        .with_state(pool);

    axum::Server::bind(&"0.0.0.0:8080".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
