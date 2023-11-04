use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool};
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
struct Goods {
    id: Uuid,
    name: String,
}

async fn get_goods(State(pool): State<PgPool>) -> Json<Vec<Goods>> {
    Json(
        sqlx::query_as("SELECT * from goods")
            .fetch_all(&pool)
            .await
            // TODO: エラー処理
            .unwrap(),
    )
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
        .route("/goods", get(get_goods))
        .with_state(pool);

    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
