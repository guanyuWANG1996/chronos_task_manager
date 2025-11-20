package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "strings"

    "golang.org/x/crypto/bcrypt"

    "chronos-task-manager/pkg/db"
)

type registerReq struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type jsonResp struct {
    OK    bool        `json:"ok"`
    Data  interface{} `json:"data,omitempty"`
    Error string      `json:"error,omitempty"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "method not allowed"})
        return
    }
    var req registerReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "invalid json"})
        return
    }
    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    if req.Email == "" || len(req.Password) < 6 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "invalid email or password"})
        return
    }
    ctx := context.Background()
    pool, err := db.GetPool(ctx)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
        return
    }
    var exists bool
    if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", req.Email).Scan(&exists); err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
        return
    }
    if exists {
        w.WriteHeader(http.StatusConflict)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "email already registered"})
        return
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "hash error"})
        return
    }
    var id int64
    if err := pool.QueryRow(ctx, "INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id", req.Email, string(hash)).Scan(&id); err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(jsonResp{OK: true, Data: map[string]any{"id": id, "email": req.Email}})
}