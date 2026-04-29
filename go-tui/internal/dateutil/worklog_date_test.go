package dateutil

import (
	"testing"
	"time"
)

func TestParseWorklogDateAt(t *testing.T) {
	now := time.Date(2026, 4, 29, 15, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "today", in: "today", want: "2026-04-29"},
		{name: "empty", in: "", want: "2026-04-29"},
		{name: "yesterday", in: "yesterday", want: "2026-04-28"},
		{name: "last monday", in: "last monday", want: "2026-04-27"},
		{name: "last tuesday", in: "last tuesday", want: "2026-04-28"},
		{name: "last wednesday", in: "last wednesday", want: "2026-04-22"},
		{name: "last thursday", in: "last thursday", want: "2026-04-23"},
		{name: "last friday", in: "last friday", want: "2026-04-24"},
		{name: "date", in: "2026-04-24", want: "2026-04-24"},
		{name: "normalizes spaces", in: "  Last   Friday  ", want: "2026-04-24"},
		{name: "typo last thurday", in: "last thurday", want: "2026-04-23"},
		{name: "typo last tuedays", in: "last tuedays", want: "2026-04-28"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseWorklogDateAt(tt.in, now)
			if err != nil {
				t.Fatalf("parseWorklogDateAt() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("parseWorklogDateAt() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseWorklogDateAtInvalid(t *testing.T) {
	_, err := parseWorklogDateAt("last someday", time.Date(2026, 4, 29, 15, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("parseWorklogDateAt() error = nil, want error")
	}
}
