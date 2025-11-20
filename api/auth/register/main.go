package handler

import (
	"context"
	"encoding/json"
	"log"
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
	log.Printf("register Handler invoked: method=%s path=%s", r.Method, r.URL.Path)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "method not allowed"})
		return
	}
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "invalid json"})
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "invalid email or password"})
		return
	}
	ctx := context.Background()
	pool, err := db.GetPool(ctx)
	if err != nil {
		log.Printf("register GetPool error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
		return
	}
	var exists bool
	if err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", req.Email).Scan(&exists); err != nil {
		log.Printf("register query exists error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
		return
	}
	if exists {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "email already registered"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("register bcrypt error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "hash error"})
		return
	}
	var id int64
	if err := pool.QueryRow(ctx, "INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id", req.Email, string(hash)).Scan(&id); err != nil {
		log.Printf("register insert error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(jsonResp{OK: false, Error: "db error"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(jsonResp{OK: true, Data: map[string]interface{}{"id": id, "email": req.Email}})
}
