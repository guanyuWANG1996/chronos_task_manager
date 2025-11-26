package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"chronos-task-manager/pkg/auth"
	"chronos-task-manager/pkg/db"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	token, err := auth.FromAuthHeader(r.Header.Get("Authorization"))
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "unauthorized"})
		return
	}
	c, err := auth.ParseToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "unauthorized"})
		return
	}
	ctx := context.Background()
	pool, err := db.GetPool(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}

	switch r.Method {
	case http.MethodPut:
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
			return
		}
		var sid int64
		switch v := body["id"].(type) {
		case float64:
			sid = int64(v)
		case string:
			if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
				sid = parsed
			}
		}
		if sid == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing id"})
			return
		}
		title, _ := body["title"].(string)
		_, err := pool.Exec(ctx, "UPDATE subtasks SET title=COALESCE(NULLIF($1,''), title) WHERE id=$2 AND todo_id IN (SELECT id FROM todos WHERE user_id=$3)", title, sid, c.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	case http.MethodPatch:
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
			return
		}
		var sid int64
		switch v := body["id"].(type) {
		case float64:
			sid = int64(v)
		case string:
			if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
				sid = parsed
			}
		}
		if sid == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing id"})
			return
		}
		_, err := pool.Exec(ctx, "UPDATE subtasks SET completed = NOT completed WHERE id=$1 AND todo_id IN (SELECT id FROM todos WHERE user_id=$2)", sid, c.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	case http.MethodPost:
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
			return
		}
		var tid int64
		switch v := body["todoId"].(type) {
		case float64:
			tid = int64(v)
		case string:
			if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
				tid = parsed
			}
		}
		if tid == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing todoId"})
			return
		}
		title, _ := body["title"].(string)
		var sid int64
		if err := pool.QueryRow(ctx, "INSERT INTO subtasks(todo_id,title,completed) VALUES($1,$2,false) RETURNING id", tid, title).Scan(&sid); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "data": map[string]interface{}{"id": sid, "title": title, "completed": false}})
	case http.MethodDelete:
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
			return
		}
		var sid int64
		switch v := body["id"].(type) {
		case float64:
			sid = int64(v)
		case string:
			if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
				sid = parsed
			}
		}
		if sid == 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing id"})
			return
		}
		_, err := pool.Exec(ctx, "DELETE FROM subtasks WHERE id=$1 AND todo_id IN (SELECT id FROM todos WHERE user_id=$2)", sid, c.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "method not allowed"})
	}
}
