import { ref } from 'vue';

interface SettlementHistoryPoint {
  date: string;
  amount: number;
}

interface SettlementsState {
  open: Array<{ id: string; amount: number }>;
  history: SettlementHistoryPoint[];
  updatedAt: Date;
}

export function useSettlements(merchantId: string, timeframe: '7d' | '30d') {
  const state = ref<SettlementsState>({
    open: [],
    history: [],
    updatedAt: new Date(),
  });

  const history = Array.from({ length: timeframe === '7d' ? 7 : 30 }).map((_, index) => ({
    date: new Date(Date.now() - index * 86400000).toLocaleDateString(),
    amount: Math.round(Math.random() * 1_000_000),
  })).reverse();

  state.value = {
    open: history.slice(-3).map((point, index) => ({ id: `${merchantId}-${index}`, amount: point.amount })),
    history,
    updatedAt: new Date(),
  };

  return state;
}
