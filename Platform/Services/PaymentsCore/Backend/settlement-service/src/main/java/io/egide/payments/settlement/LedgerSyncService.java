package io.egide.payments.settlement;

import java.time.Instant;
import java.util.List;

public interface LedgerSyncService {
    List<LedgerEntry> loadOpenEntries(String merchantId);
    void markSettled(String entryId, Instant settledAt);
}
