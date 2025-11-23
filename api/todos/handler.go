package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "strconv"
    "log"

    "chronos-task-manager/pkg/auth"
    "chronos-task-manager/pkg/db"
)

type todo struct {
    ID          int64  `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description,omitempty"`
    Date        string `json:"date"`
    Time        string `json:"time,omitempty"`
    GroupID     string `json:"groupId"`
    Completed   bool   `json:"completed"`
    Subtasks    []subtask `json:"subtasks,omitempty"`
}

type subtask struct {
    ID        int64  `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
    log.Printf("todos Handler invoked: method=%s path=%s", r.Method, r.URL.Path)
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
        log.Printf("todos GetPool error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
        return
    }
    switch r.Method {
    case http.MethodGet:
        date := r.URL.Query().Get("date")
        rows, err := pool.Query(ctx, "SELECT id,title,COALESCE(description,''),to_char(date,'YYYY-MM-DD'),COALESCE(time,''),group_id,completed FROM todos WHERE user_id=$1 AND date=$2 ORDER BY id DESC", c.UserID, date)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
            return
        }
        defer rows.Close()
        var list []todo
        var ids []int64
        for rows.Next() {
            var t todo
            if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Date, &t.Time, &t.GroupID, &t.Completed); err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
                return
            }
            list = append(list, t)
            ids = append(ids, t.ID)
        }
        if len(ids) > 0 {
            rows2, err := pool.Query(ctx, "SELECT id,todo_id,title,completed FROM subtasks WHERE todo_id = ANY($1)", ids)
            if err == nil {
                defer rows2.Close()
                m := map[int64][]subtask{}
                for rows2.Next() {
                    var sid, tid int64
                    var st subtask
                    if err := rows2.Scan(&sid, &tid, &st.Title, &st.Completed); err == nil {
                        st.ID = sid
                        m[tid] = append(m[tid], st)
                    }
                }
                for i := range list {
                    list[i].Subtasks = m[list[i].ID]
                }
            }
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
        err := pool.QueryRow(ctx, "INSERT INTO todos(user_id,title,description,date,time,group_id,completed) VALUES($1,$2,$3,$4,$5,$6,false) RETURNING id", c.UserID, payload.Title, payload.Description, payload.Date, payload.Time, payload.GroupID).Scan(&id)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
            return
        }
        if len(payload.Subtasks) > 0 {
            for _, st := range payload.Subtasks {
                _, _ = pool.Exec(ctx, "INSERT INTO subtasks(todo_id,title,completed) VALUES($1,$2,$3)", id, st.Title, st.Completed)
            }
        }
        payload.ID = id
        payload.Completed = false
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "data": payload})
    case http.MethodPut:
        var body map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "invalid json"})
            return
        }
        var id int64
        switch v := body["id"].(type) {
        case float64:
            id = int64(v)
        case string:
            if parsed, err := strconv.ParseInt(v, 10, 64); err == nil { id = parsed }
        }
        if id == 0 { w.WriteHeader(http.StatusBadRequest); json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "missing id"}); return }
        title, _ := body["title"].(string)
        desc, _ := body["description"].(string)
        date, _ := body["date"].(string)
        timeStr, _ := body["time"].(string)
        groupId, _ := body["groupId"].(string)
        _, err := pool.Exec(ctx, "UPDATE todos SET title=COALESCE(NULLIF($1,''),title), description=COALESCE($2,description), date=COALESCE(NULLIF($3,'')::date,date), time=COALESCE(NULLIF($4,''),time), group_id=COALESCE(NULLIF($5,''),group_id) WHERE user_id=$6 AND id=$7", title, desc, date, timeStr, groupId, c.UserID, id)
        if err != nil { w.WriteHeader(http.StatusInternalServerError); json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()}); return }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
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
