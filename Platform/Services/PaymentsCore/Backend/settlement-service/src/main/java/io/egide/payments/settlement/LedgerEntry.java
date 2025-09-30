package io.egide.payments.settlement;

import java.math.BigDecimal;

public record LedgerEntry(String id, BigDecimal amount, String currency) { }
