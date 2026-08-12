package api

import "github.com/gin-gonic/gin"

type Problem struct {
	Status    int         `json:"status"`
	Code      string      `json:"code"`
	Detail    string      `json:"detail"`
	RequestID string      `json:"requestId"`
	Fields    interface{} `json:"fields,omitempty"`
}

func writeProblem(c *gin.Context, status int, code, detail string) {
	c.AbortWithStatusJSON(status, Problem{Status: status, Code: code, Detail: detail, RequestID: requestID(c)})
}
