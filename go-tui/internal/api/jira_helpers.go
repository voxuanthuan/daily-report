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

	req.SetBasicAuth(c.username, c.apiToken)
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

// decodeResponse decodes a JSON response
func (c *JiraClient) decodeResponse(resp *http.Response, v interface{}) error {
	return json.NewDecoder(resp.Body).Decode(v)
}

// readBody reads the response body
func (c *JiraClient) readBody(resp *http.Response) ([]byte, error) {
	return io.ReadAll(resp.Body)
}
