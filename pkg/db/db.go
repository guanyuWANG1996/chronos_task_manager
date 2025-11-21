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
    candidates := []string{
        "POSTGRES_URL",
        "DATABASE_URL",
        "POSTGRES_URL_NON_POOLING",
        "DATABASE_URL_UNPOOLED",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NO_SSL",
    }
    for _, k := range candidates {
        log.Printf("db env %s present=%t", k, os.Getenv(k) != "")
    }
    url := firstNonEmpty(
        os.Getenv("POSTGRES_URL"),
        os.Getenv("DATABASE_URL"),
        os.Getenv("POSTGRES_URL_NON_POOLING"),
        os.Getenv("DATABASE_URL_UNPOOLED"),
        os.Getenv("POSTGRES_PRISMA_URL"),
        os.Getenv("POSTGRES_URL_NO_SSL"),
    )
    if url == "" {
        return nil, errors.New("database url not set: expect POSTGRES_URL or DATABASE_URL")
    }
    chosen := ""
    switch {
    case os.Getenv("POSTGRES_URL") != "":
        chosen = "POSTGRES_URL"
    case os.Getenv("DATABASE_URL") != "":
        chosen = "DATABASE_URL"
    case os.Getenv("POSTGRES_URL_NON_POOLING") != "":
        chosen = "POSTGRES_URL_NON_POOLING"
    case os.Getenv("DATABASE_URL_UNPOOLED") != "":
        chosen = "DATABASE_URL_UNPOOLED"
    case os.Getenv("POSTGRES_PRISMA_URL") != "":
        chosen = "POSTGRES_PRISMA_URL"
    case os.Getenv("POSTGRES_URL_NO_SSL") != "":
        chosen = "POSTGRES_URL_NO_SSL"
    }
    log.Printf("db GetPool selecting url from %s", chosen)
    if !strings.Contains(url, "sslmode=") {
        if strings.Contains(url, "?") {
            url += "&sslmode=require"
        } else {
            url += "?sslmode=require"
        }
    }
    cfg, err := pgxpool.ParseConfig(url)
    if err != nil {
        log.Printf("db ParseConfig error: %v", err)
        return nil, err
    }
    cfg.MaxConns = 4
    cfg.MaxConnLifetime = 30 * time.Minute
    p, err := pgxpool.NewWithConfig(ctx, cfg)
    if err != nil {
        log.Printf("db NewWithConfig error: %v", err)
        return nil, err
    }
    if err := initSchema(ctx, p); err != nil {
        p.Close()
        log.Printf("db initSchema error: %v", err)
        return nil, err
    }
    if err := migrateSchema(ctx, p); err != nil {
        // Try non-pooling on migration errors
        log.Printf("db migrateSchema error: %v", err)
        if err2 := migrateSchemaNonPooling(ctx); err2 != nil {
            log.Printf("db migrateSchema non-pooling error: %v", err2)
        }
    }
    pool = p
    log.Printf("db pool initialized")
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
        log.Printf("init users table succeeded via non-pooling connection")
    }
    if _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS todos (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            time TEXT,
            group_id TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
        log.Printf("init todos table error: %v", err)
        if err2 := initSchemaNonPooling(ctx); err2 != nil {
            return err
        }
        log.Printf("init todos table succeeded via non-pooling connection")
    }
    if _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS subtasks (
            id BIGSERIAL PRIMARY KEY,
            todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE
        )
    `); err != nil {
        log.Printf("init subtasks table error: %v", err)
        if err2 := initSchemaNonPooling(ctx); err2 != nil {
            return err
        }
        log.Printf("init subtasks table succeeded via non-pooling connection")
    }
    return nil
}

// Ensure new columns exist when table already created previously
func migrateSchema(ctx context.Context, p *pgxpool.Pool) error {
    // Add time column if not exists
    if _, err := p.Exec(ctx, `ALTER TABLE IF EXISTS todos ADD COLUMN IF NOT EXISTS time TEXT`); err != nil {
        return err
    }
    // Create subtasks if missing
    if _, err := p.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS subtasks (
            id BIGSERIAL PRIMARY KEY,
            todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE
        )`); err != nil {
        return err
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
            time TEXT,
            group_id TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `); err != nil {
        return err
    }
    if _, err := conn.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS subtasks (
            id BIGSERIAL PRIMARY KEY,
            todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE
        )
    `); err != nil {
        return err
    }
    return nil
}

func migrateSchemaNonPooling(ctx context.Context) error {
    url := firstNonEmpty(
        os.Getenv("POSTGRES_URL_NON_POOLING"),
        os.Getenv("DATABASE_URL_UNPOOLED"),
        os.Getenv("POSTGRES_URL"),
        os.Getenv("DATABASE_URL"),
    )
    if url == "" { return nil }
    if !strings.Contains(url, "sslmode=") {
        if strings.Contains(url, "?") { url += "&sslmode=require" } else { url += "?sslmode=require" }
    }
    conn, err := pgx.Connect(ctx, url)
    if err != nil { return err }
    defer conn.Close(ctx)
    if _, err := conn.Exec(ctx, `ALTER TABLE IF EXISTS todos ADD COLUMN IF NOT EXISTS time TEXT`); err != nil { return err }
    if _, err := conn.Exec(ctx, `
        CREATE TABLE IF NOT EXISTS subtasks (
            id BIGSERIAL PRIMARY KEY,
            todo_id BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE
        )`); err != nil { return err }
    return nil
}
