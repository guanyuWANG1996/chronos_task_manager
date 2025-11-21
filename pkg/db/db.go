package db

import (
    "context"
    "errors"
    "log"
    "os"
    "strings"
    "sync"
    "time"

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
    // DDL 迁移已移除；请在数据库中手动执行必要的 SQL 以创建/更新表结构
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
