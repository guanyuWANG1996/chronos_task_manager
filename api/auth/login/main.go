package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "strings"

    "golang.org/x/crypto/bcrypt"

    "chronos-task-manager/pkg/auth"
    "chronos-task-manager/pkg/db"
)

type loginReq struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type loginResp struct {
    OK    bool   `json:"ok"`
    Token string `json:"token,omitempty"`
    Error string `json:"error,omitempty"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "method not allowed"})
        return
    }
    var req loginReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "invalid json"})
        return
    }
    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    ctx := context.Background()
    pool, err := db.GetPool(ctx)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "db error"})
        return
    }
    var id int64
    var hash string
    if err := pool.QueryRow(ctx, "SELECT id, password_hash FROM users WHERE email=$1", req.Email).Scan(&id, &hash); err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "invalid credentials"})
        return
    }
    if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "invalid credentials"})
        return
    }
    token, err := auth.GenerateToken(id, req.Email)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(loginResp{OK: false, Error: "token error"})
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(loginResp{OK: true, Token: token})
}
