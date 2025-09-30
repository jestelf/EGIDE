package io.egide.payments.settlement;

import java.math.BigDecimal;
import java.time.Instant;

public record SettlementReport(String id, BigDecimal amount, Instant settledAt) { }
