<template>
  <section class="settlement-widget">
    <header>
      <h2>Settlement Overview</h2>
      <p>{{ subtitle }}</p>
    </header>
    <div class="settlement-widget__content">
      <div class="settlement-widget__stats">
        <dl>
          <div>
            <dt>Open settlements</dt>
            <dd>{{ stats.openSettlements }}</dd>
          </div>
          <div>
            <dt>Disputes</dt>
            <dd>{{ stats.disputes }}</dd>
          </div>
        </dl>
      </div>
      <highcharts :options="chartOptions" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettlements } from '../composables/useSettlements';
import { useAlerts } from '../composables/useAlerts';

defineProps<{ merchantId: string; timeframe: '7d' | '30d' }>();

const props = defineProps<{ merchantId: string; timeframe: '7d' | '30d' }>();
const settlements = useSettlements(props.merchantId, props.timeframe);
const alerts = useAlerts(props.merchantId);

const stats = computed(() => ({
  openSettlements: settlements.value.open.length,
  disputes: alerts.value.disputes,
}));

const chartOptions = computed(() => ({
  title: { text: 'Daily settlement volume' },
  xAxis: { categories: settlements.value.history.map(item => item.date) },
  series: [
    {
      type: 'column',
      name: 'Volume',
      data: settlements.value.history.map(item => item.amount),
    }
  ],
}));

const subtitle = computed(() => `Last update ${settlements.value.updatedAt.toLocaleString()}`);
</script>
