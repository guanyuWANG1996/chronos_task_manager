package auth

import (
    "errors"
    "os"
    "strings"

    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID int64  `json:"user_id"`
    Email  string `json:"email"`
    jwt.RegisteredClaims
}

func secret() []byte { return []byte(os.Getenv("JWT_SECRET")) }

func GenerateToken(userID int64, email string) (string, error) {
    if len(secret()) == 0 {
        return "", errors.New("jwt secret not configured")
    }
    c := Claims{UserID: userID, Email: email}
    t := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
    return t.SignedString(secret())
}

func ParseToken(token string) (*Claims, error) {
    if len(secret()) == 0 {
        return nil, errors.New("jwt secret not configured")
    }
    parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
        return secret(), nil
    })
    if err != nil {
        return nil, err
    }
    if c, ok := parsed.Claims.(*Claims); ok && parsed.Valid {
        return c, nil
    }
    return nil, errors.New("invalid token")
}

func FromAuthHeader(h string) (string, error) {
    if h == "" {
        return "", errors.New("missing authorization")
    }
    parts := strings.SplitN(h, " ", 2)
    if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
        return "", errors.New("invalid authorization format")
    }
    return parts[1], nil
}

