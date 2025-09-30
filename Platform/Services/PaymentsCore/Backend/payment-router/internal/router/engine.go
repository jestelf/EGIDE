package router

import (
    "encoding/json"
    "net/http"
    "time"
)

type PaymentRequest struct {
    MerchantID string  `json:"merchantId"`
    Amount     float64 `json:"amount"`
    Currency   string  `json:"currency"`
    Channel    string  `json:"channel"`
}

type RouteDecision struct {
    Gateway   string    `json:"gateway"`
    RetryIn   time.Duration `json:"retryIn"`
    TraceID   string    `json:"traceId"`
    Timestamp time.Time `json:"timestamp"`
}

type Engine struct{}

func NewEngine() *Engine {
    return &Engine{}
}

func (e *Engine) RoutePayment(w http.ResponseWriter, r *http.Request) {
    var request PaymentRequest
    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    decision := RouteDecision{
        Gateway:   selectGateway(request),
        RetryIn:   150 * time.Millisecond,
        TraceID:   time.Now().Format("20060102-150405"),
        Timestamp: time.Now().UTC(),
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(decision); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func selectGateway(request PaymentRequest) string {
    switch request.Channel {
    case "pos":
        return "card-present-primary"
    case "online":
        if request.Amount > 1000 {
            return "high-value-secondary"
        }
        return "online-primary"
    default:
        return "fallback"
    }
}
