package io.egide.payments.settlement;

public interface TreasuryGateway {
    SettlementReport settle(LedgerEntry entry);
}
