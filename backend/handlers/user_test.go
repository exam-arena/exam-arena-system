package handlers

import (
	"net/http"
	"testing"
)

func TestBuildAuthCookieDefaultsToHostOnly(t *testing.T) {
	t.Setenv("COOKIE_DOMAIN", "")
	t.Setenv("COOKIE_SECURE", "")

	cookie := buildAuthCookie(&http.Request{})

	if cookie.Domain != "" {
		t.Fatalf("expected host-only cookie domain, got %q", cookie.Domain)
	}
	if cookie.Secure {
		t.Fatal("expected insecure cookie for non-TLS request without COOKIE_SECURE override")
	}
}

func TestBuildAuthCookieUsesConfiguredDomain(t *testing.T) {
	t.Setenv("COOKIE_DOMAIN", " .examarena.id.vn ")
	t.Setenv("COOKIE_SECURE", "true")

	cookie := buildAuthCookie(&http.Request{})

	if cookie.Domain != ".examarena.id.vn" {
		t.Fatalf("expected configured cookie domain, got %q", cookie.Domain)
	}
	if !cookie.Secure {
		t.Fatal("expected secure cookie when COOKIE_SECURE=true")
	}
}
