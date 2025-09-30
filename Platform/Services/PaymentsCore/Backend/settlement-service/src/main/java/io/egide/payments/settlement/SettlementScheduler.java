package io.egide.payments.settlement;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class SettlementScheduler {
    private final TreasuryGateway treasuryGateway;
    private final LedgerSyncService ledgerSyncService;

    public SettlementScheduler(TreasuryGateway treasuryGateway, LedgerSyncService ledgerSyncService) {
        this.treasuryGateway = treasuryGateway;
        this.ledgerSyncService = ledgerSyncService;
    }

    public List<SettlementReport> closePeriod(String merchantId) {
        List<SettlementReport> reports = new ArrayList<>();
        for (LedgerEntry entry : ledgerSyncService.loadOpenEntries(merchantId)) {
            SettlementReport report = treasuryGateway.settle(entry);
            ledgerSyncService.markSettled(entry.id(), Instant.now());
            reports.add(report);
        }
        return reports;
    }

    public Duration expectedDuration() {
        return Duration.ofMinutes(12);
    }
}
