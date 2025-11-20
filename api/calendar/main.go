package handler

import (
    "context"
    "encoding/json"
    "net/http"

    "chronos-task-manager/pkg/auth"
    "chronos-task-manager/pkg/db"
)

type daySummary struct {
	Date      string `json:"date"`
	HasTasks  bool   `json:"hasTasks"`
	Pending   int    `json:"pending"`
	Completed int    `json:"completed"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusMethodNotAllowed)
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "method not allowed"})
        return
    }
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
	month := r.URL.Query().Get("month")
	ctx := context.Background()
    pool, err := db.GetPool(ctx)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
        return
    }
	rows, err := pool.Query(ctx, `
        SELECT to_char(date,'YYYY-MM-DD') as d,
               SUM(CASE WHEN completed THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN completed THEN 0 ELSE 1 END) AS pending
        FROM todos
        WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2
        GROUP BY d
    `, c.UserID, month)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "db error"})
        return
    }
	defer rows.Close()
	var res []daySummary
	for rows.Next() {
		var d daySummary
		if err := rows.Scan(&d.Date, &d.Completed, &d.Pending); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "db error"})
			return
		}
		d.HasTasks = d.Completed+d.Pending > 0
		res = append(res, d)
	}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "data": res})
}
