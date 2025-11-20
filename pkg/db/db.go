package db

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool
var initOnce sync.Once

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

// initSchema initializes the database schema on cold start.
func init() {
	initOnce.Do(func() {
		if _, err := GetPool(context.Background()); err != nil {
			log.Printf("db init on cold start failed: %v", err)
		}
	})
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
	if _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
		log.Printf("init users table error: %v", err)
		if err2 := initSchemaNonPooling(ctx); err2 != nil {
			return err
		}
	}
	if _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS todos (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            group_id TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
		log.Printf("init todos table error: %v", err)
		if err2 := initSchemaNonPooling(ctx); err2 != nil {
			return err
		}
	}
	return nil
}

func initSchemaNonPooling(ctx context.Context) error {
	url := firstNonEmpty(
		os.Getenv("POSTGRES_URL_NON_POOLING"),
		os.Getenv("DATABASE_URL_UNPOOLED"),
		os.Getenv("POSTGRES_URL"),
		os.Getenv("DATABASE_URL"),
	)
	if url == "" {
		return errors.New("database url not set for non-pooling init")
	}
	if !strings.Contains(url, "sslmode=") {
		if strings.Contains(url, "?") {
			url += "&sslmode=require"
		} else {
			url += "?sslmode=require"
		}
	}
	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
		return err
	}
	if _, err := conn.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS todos (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            group_id TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
		return err
	}
	return nil
}
