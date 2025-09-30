import { ref } from 'vue';

interface AlertsState {
  disputes: number;
  escalations: number;
}

export function useAlerts(merchantId: string) {
  const state = ref<AlertsState>({ disputes: 0, escalations: 0 });

  state.value = {
    disputes: merchantId.length % 7,
    escalations: Math.max(0, 5 - (merchantId.length % 5)),
  };

  return state;
}
