package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

// buildRequest creates an HTTP request with authentication
func (c *JiraClient) buildRequest(method, url string, body interface{}) (*http.Request, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	c.setAuth(req)
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

// setAuth sets authentication header - prefers OAuth Bearer token, falls back to Basic Auth
func (c *JiraClient) setAuth(req *http.Request) {
	if c.oauthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.oauthToken)
	} else {
		req.SetBasicAuth(c.username, c.apiToken)
	}
}

// decodeResponse decodes a JSON response
func (c *JiraClient) decodeResponse(resp *http.Response, v interface{}) error {
	return json.NewDecoder(resp.Body).Decode(v)
}

// readBody reads the response body
func (c *JiraClient) readBody(resp *http.Response) ([]byte, error) {
	return io.ReadAll(resp.Body)
}
