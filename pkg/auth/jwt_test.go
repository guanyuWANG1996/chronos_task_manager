package auth

import (
    "os"
    "testing"
)

func TestJWTGenerateParse(t *testing.T) {
    os.Setenv("JWT_SECRET", "testsecret")
    tok, err := GenerateToken(42, "a@b.com")
    if err != nil {
        t.Fatalf("generate error: %v", err)
    }
    claims, err := ParseToken(tok)
    if err != nil {
        t.Fatalf("parse error: %v", err)
    }
    if claims.UserID != 42 || claims.Email != "a@b.com" {
        t.Fatalf("claims mismatch: %+v", claims)
    }
}

func TestFromAuthHeader(t *testing.T) {
    tok := "abc.def.ghi"
    got, err := FromAuthHeader("Bearer " + tok)
    if err != nil {
        t.Fatalf("parse header error: %v", err)
    }
    if got != tok {
        t.Fatalf("token mismatch: %s", got)
    }
}