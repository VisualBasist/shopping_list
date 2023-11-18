use axum::{
    extract::{Path, State},
    http::{HeaderValue, StatusCode},
    routing::{get, post, put, delete},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
struct StoreItem {
    name: String,
    store_id: Uuid,
    item_id: Uuid,
    is_done: bool,
    price: Option<f64>,
}

async fn get_store_items(
    Path(store_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Json<Vec<StoreItem>> {
    Json(
        sqlx::query_as("SELECT items.name, store_items.store_id, store_items.item_id, store_items.is_done, store_items.price
FROM store_items
JOIN items ON items.id = store_items.item_id
WHERE store_id = $1
ORDER BY order_number")
            .bind(store_id)
            .fetch_all(&pool)
            .await
            // TODO: エラー処理
            .unwrap(),
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreItemOrderNumberRequest {
    destination_item_id: Uuid,
}

async fn put_store_item_ordernumber(
    Path((store_id, item_id)): Path<(Uuid, Uuid)>,
    State(pool): State<PgPool>,
    Json(StoreItemOrderNumberRequest {
        destination_item_id,
    }): Json<StoreItemOrderNumberRequest>,
) -> StatusCode {
    // FIXME: 競合しちゃう
    let mut transaction = pool.begin().await.unwrap();
    let (source_order_number,): (i32,) =
        sqlx::query_as("SELECT order_number FROM store_items WHERE store_id = $1 AND item_id = $2")
            .bind(store_id)
            .bind(item_id)
            .fetch_one(&mut *transaction)
            .await
            .unwrap();
    let (destination_order_number,): (i32,) =
        sqlx::query_as("SELECT order_number FROM store_items WHERE store_id = $1 AND item_id = $2")
            .bind(store_id)
            .bind(destination_item_id)
            .fetch_one(&mut *transaction)
            .await
            .unwrap();
    sqlx::query(
        if destination_order_number>source_order_number{
            "UPDATE store_items SET order_number=order_number-1 WHERE store_id = $1 AND order_number > $2 AND order_number <= $3"
        }else{
            "UPDATE store_items SET order_number=order_number+1 WHERE store_id = $1 AND order_number < $2 AND order_number >= $3"
        }
    )
    .bind(store_id)
    .bind(source_order_number)
    .bind(destination_order_number)
    .execute(&mut *transaction)
    .await
    .unwrap();
    sqlx::query("UPDATE store_items SET order_number=$1 WHERE store_id = $2 AND item_id = $3")
        .bind(destination_order_number)
        .bind(store_id)
        .bind(item_id)
        .execute(&mut *transaction)
        .await
        .unwrap();
    transaction.commit().await.unwrap();
    StatusCode::NO_CONTENT
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreItemRequest {
    name: String,
}

async fn post_store_item(
    Path(store_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(StoreItemRequest { name }): Json<StoreItemRequest>,
) -> StatusCode {
    let mut transaction = pool.begin().await.unwrap();
    sqlx::query("INSERT INTO items (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING")
        .bind(Uuid::new_v4())
        .bind(&name)
        .execute(&mut *transaction)
        .await
        .unwrap();
    let (item_id,): (Uuid,) = sqlx::query_as("SELECT id FROM items WHERE name = $1")
        .bind(&name)
        .fetch_one(&mut *transaction)
        .await
        .unwrap();
    sqlx::query("UPDATE store_items set order_number=order_number+1 WHERE store_id = $1")
        .bind(store_id)
        .execute(&mut *transaction)
        .await
        .unwrap();
    sqlx::query("INSERT INTO store_items (store_id, item_id, is_done, order_number) VALUES ($1, $2, false, 1)")
        .bind(store_id)
        .bind(item_id)
        .execute(&mut *transaction)
        .await
        .unwrap();
    transaction.commit().await.unwrap();
    StatusCode::NO_CONTENT
}

async fn delete_store_item(
    Path((store_id, item_id)): Path<(Uuid, Uuid)>,
    State(pool): State<PgPool>,
) -> StatusCode {
    sqlx::query("DELETE from store_items WHERE store_id = $1 AND item_id = $2")
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
        .route(
            "/stores/:store_id/items",
            post(post_store_item).get(get_store_items),
        )
        .route(
            "/stores/:store_id/items/:item_id",
            delete(delete_store_item),
        )
        .route(
            "/stores/:store_id/items/:item_id/state",
            put(put_store_item_state),
        )
        .route(
            "/stores/:store_id/items/:item_id/ordernumber",
            put(put_store_item_ordernumber),
        )
        .layer(
            // TODO: 全てのパスで同じにしてしまってるので厳密に
            CorsLayer::new()
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PUT,
                    axum::http::Method::DELETE,
                ])
                .allow_headers([axum::http::header::CONTENT_TYPE])
                .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap()),
        )
        .with_state(pool);

    axum::Server::bind(&"0.0.0.0:8080".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
