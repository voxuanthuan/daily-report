package oauth

import (
	"context"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"sync"
	"time"
)

// AuthResult contains the OAuth callback result
type AuthResult struct {
	Code  string
	Error string
}

// CallbackServer handles OAuth callbacks with enhanced security
type CallbackServer struct {
	server     *http.Server
	listener   net.Listener
	authResult chan AuthResult
	state      string
	mu         sync.Mutex
	done       chan struct{}
	port       int
}

// NewCallbackServer creates a callback server with given state
func NewCallbackServer(state string) *CallbackServer {
	return &CallbackServer{
		authResult: make(chan AuthResult, 1),
		state:      state,
		done:       make(chan struct{}),
	}
}

// Start begins the callback server on a well-known port with fallback
// SECURITY: Tries ports 8080-8089 first (for OAuth app registration),
// then falls back to random port if all are occupied
func (s *CallbackServer) Start() (string, error) {
	// Try well-known ports first (8080-8089)
	// This allows users to register http://localhost:8080/callback in OAuth settings
	preferredPorts := []int{8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089}

	var listener net.Listener
	var err error

	// Try preferred ports first
	for _, port := range preferredPorts {
		listener, err = net.Listen("tcp", fmt.Sprintf("localhost:%d", port))
		if err == nil {
			s.listener = listener
			s.port = port
			break
		}
	}

	// If all preferred ports are occupied, use random port
	if listener == nil {
		listener, err = net.Listen("tcp", "localhost:0")
		if err != nil {
			return "", fmt.Errorf("failed to start listener: %w", err)
		}
		s.listener = listener
		s.port = listener.Addr().(*net.TCPAddr).Port
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/callback", s.handleCallback)

	s.server = &http.Server{
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		// SECURITY: Limit max header bytes to prevent DoS
		MaxHeaderBytes: 1 << 16, // 64KB
	}

	go func() {
		if err := s.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			s.authResult <- AuthResult{Error: fmt.Sprintf("server error: %v", err)}
			close(s.done)
		}
	}()

	return fmt.Sprintf("http://localhost:%d/callback", s.port), nil
}

// GetPort returns the dynamically allocated port
func (s *CallbackServer) GetPort() int {
	return s.port
}

// Styled HTML templates for better UX
const successTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
        }
        .icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #00d9ff, #0070f3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 40px;
        }
        h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
        p { color: rgba(255,255,255,0.7); line-height: 1.6; }
        .hint { font-size: 0.875rem; margin-top: 1.5rem; opacity: 0.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>Authentication Successful!</h1>
        <p>You've been authenticated with Jira CLI.</p>
        <p class="hint">You can close this window and return to your terminal.</p>
    </div>
    <script>
        // Auto-close after 3 seconds for better UX
        setTimeout(() => { window.close(); }, 3000);
    </script>
</body>
</html>`

const errorTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Failed</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
        }
        .icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #ff4d4d, #ff0844);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 40px;
        }
        h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
        p { color: rgba(255,255,255,0.7); line-height: 1.6; }
        .error-msg { 
            background: rgba(255,77,77,0.1); 
            padding: 1rem; 
            border-radius: 8px; 
            margin-top: 1rem;
            font-family: monospace;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✕</div>
        <h1>Authentication Failed</h1>
        <p>An error occurred during authentication.</p>
        <div class="error-msg">{{.Error}}</div>
    </div>
</body>
</html>`

// handleCallback processes the OAuth callback
func (s *CallbackServer) handleCallback(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	// SECURITY: Constant-time comparison for state to prevent timing attacks
	receivedState := query.Get("state")
	if len(receivedState) != len(s.state) || receivedState != s.state {
		s.renderError(w, "Invalid state parameter - possible CSRF attack")
		s.authResult <- AuthResult{Error: "invalid state parameter"}
		return
	}

	// Check for OAuth error response
	if errCode := query.Get("error"); errCode != "" {
		errDesc := query.Get("error_description")
		if errDesc == "" {
			errDesc = errCode
		}
		s.renderError(w, errDesc)
		s.authResult <- AuthResult{Error: errDesc}
		return
	}

	if code := query.Get("code"); code != "" {
		s.authResult <- AuthResult{Code: code}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(successTemplate))
	} else {
		s.renderError(w, "No authorization code received")
		s.authResult <- AuthResult{Error: "no authorization code"}
	}
}

func (s *CallbackServer) renderError(w http.ResponseWriter, errorMsg string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusBadRequest)

	tmpl, err := template.New("error").Parse(errorTemplate)
	if err != nil {
		w.Write([]byte("Authentication failed: " + errorMsg))
		return
	}
	tmpl.Execute(w, map[string]string{"Error": errorMsg})
}

// WaitForAuthCode waits for the authorization code with timeout
// SECURITY: Reduced timeout to 3 minutes to minimize attack window
func (s *CallbackServer) WaitForAuthCode(ctx context.Context) (string, error) {
	timeout := time.After(3 * time.Minute)

	select {
	case result := <-s.authResult:
		s.Shutdown()
		if result.Error != "" {
			return "", fmt.Errorf("authentication failed: %s", result.Error)
		}
		return result.Code, nil
	case <-ctx.Done():
		s.Shutdown()
		return "", ctx.Err()
	case <-s.done:
		return "", fmt.Errorf("server closed unexpectedly")
	case <-timeout:
		s.Shutdown()
		return "", fmt.Errorf("authentication timeout - please try again")
	}
}

// Shutdown gracefully stops the server
func (s *CallbackServer) Shutdown() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.server.Shutdown(ctx)
	}
}
