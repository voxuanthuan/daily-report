package refresh

import "time"

// Config holds configuration for polling and verification
type Config struct {
	// MaxAttempts is the maximum number of polling attempts before giving up
	MaxAttempts int

	// InitialDelay is the delay before the first polling attempt
	InitialDelay time.Duration

	// MaxDelay is the maximum delay between polling attempts
	MaxDelay time.Duration

	// BackoffFactor is the exponential backoff multiplier
	// Each attempt's delay = previous_delay * BackoffFactor (capped at MaxDelay)
	BackoffFactor float64
}

// DefaultConfig returns sensible default configuration
func DefaultConfig() Config {
	return Config{
		MaxAttempts:   5,
		InitialDelay:  500 * time.Millisecond,
		MaxDelay:      5 * time.Second,
		BackoffFactor: 2.0,
	}
}

// GetDelay calculates the delay for a given attempt number using exponential backoff
// Attempt numbers start at 1
func (c *Config) GetDelay(attempt int) time.Duration {
	if attempt <= 0 {
		return c.InitialDelay
	}

	// Calculate exponential delay: InitialDelay * BackoffFactor^(attempt-1)
	delay := c.InitialDelay
	for i := 1; i < attempt; i++ {
		delay = time.Duration(float64(delay) * c.BackoffFactor)
		if delay > c.MaxDelay {
			return c.MaxDelay
		}
	}

	return delay
}
