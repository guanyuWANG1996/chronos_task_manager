package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "strconv"

    "chronos-task-manager/pkg/auth"
    "chronos-task-manager/pkg/db"
)

type todo struct {
    ID          int64  `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description,omitempty"`
    Date        string `json:"date"`
    GroupID     string `json:"groupId"`
    Completed   bool   `json:"completed"`
}

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
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
        return
    }
    switch r.Method {
    case http.MethodGet:
        date := r.URL.Query().Get("date")
        rows, err := pool.Query(ctx, "SELECT id,title,COALESCE(description,''),to_char(date,'YYYY-MM-DD'),group_id,completed FROM todos WHERE user_id=$1 AND date=$2 ORDER BY id DESC", c.UserID, date)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
            return
        }
        defer rows.Close()
        var list []todo
        for rows.Next() {
            var t todo
            if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Date, &t.GroupID, &t.Completed); err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
                return
            }
            list = append(list, t)
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "data": list})
    case http.MethodPost:
        var payload todo
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
            return
        }
        var id int64
        err := pool.QueryRow(ctx, "INSERT INTO todos(user_id,title,description,date,group_id,completed) VALUES($1,$2,$3,$4,$5,false) RETURNING id", c.UserID, payload.Title, payload.Description, payload.Date, payload.GroupID).Scan(&id)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
            return
        }
        payload.ID = id
        payload.Completed = false
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "data": payload})
    case http.MethodPatch:
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
            return
        }
        idStr := body["id"]
        id, _ := strconv.ParseInt(idStr, 10, 64)
        _, err := pool.Exec(ctx, "UPDATE todos SET completed = NOT completed WHERE user_id=$1 AND id=$2", c.UserID, id)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
            return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
    case http.MethodDelete:
        idStr := r.URL.Query().Get("id")
        id, _ := strconv.ParseInt(idStr, 10, 64)
        _, err := pool.Exec(ctx, "DELETE FROM todos WHERE user_id=$1 AND id=$2", c.UserID, id)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
            return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
    default:
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "method not allowed"})
    }
}