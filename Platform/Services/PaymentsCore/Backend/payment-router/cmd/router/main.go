package main

import (
    "context"
    "log"
    "net/http"
    "time"

    "github.com/gorilla/mux"
    "platform/services/paymentscore/payment-router/internal/router"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    engine := router.NewEngine()
    r := mux.NewRouter()
    r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
        _, _ = w.Write([]byte("ok"))
    })
    r.HandleFunc("/route", engine.RoutePayment).Methods(http.MethodPost)

    srv := &http.Server{
        Addr:              ":8080",
        Handler:           r,
        ReadHeaderTimeout: 5 * time.Second,
    }

    log.Println("payment-router listening on :8080")
    if err := srv.ListenAndServe(); err != nil {
        log.Fatal(err)
    }

    <-ctx.Done()
}
