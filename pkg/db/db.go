package db

import (
    "context"
    "errors"
    "os"
    "strings"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

func GetPool(ctx context.Context) (*pgxpool.Pool, error) {
    if pool != nil {
        return pool, nil
    }
    url := firstNonEmpty(
        os.Getenv("POSTGRES_URL"),
        os.Getenv("DATABASE_URL"),
        os.Getenv("POSTGRES_URL_NON_POOLING"),
        os.Getenv("DATABASE_URL_UNPOOLED"),
    )
    if url == "" {
        return nil, errors.New("database url not set: expect POSTGRES_URL or DATABASE_URL")
    }
    if !strings.Contains(url, "sslmode=") {
        if strings.Contains(url, "?") {
            url += "&sslmode=require"
        } else {
            url += "?sslmode=require"
        }
    }
    cfg, err := pgxpool.ParseConfig(url)
    if err != nil {
        return nil, err
    }
    cfg.MaxConns = 4
    cfg.MaxConnLifetime = 30 * time.Minute
    p, err := pgxpool.NewWithConfig(ctx, cfg)
    if err != nil {
        return nil, err
    }
    if err := initSchema(ctx, p); err != nil {
        p.Close()
        return nil, err
    }
    pool = p
    return pool, nil
}

func firstNonEmpty(values ...string) string {
    for _, v := range values {
        if strings.TrimSpace(v) != "" {
            return v
        }
    }
    return ""
}

func initSchema(ctx context.Context, p *pgxpool.Pool) error {
    _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS todos (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            group_id TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    `)
    return err
}