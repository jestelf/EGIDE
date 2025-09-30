import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
};

export default function () {
  const response = http.post('https://perf.egide.internal/payments', JSON.stringify({
    merchantId: 'demo-merchant',
    amount: Math.random() * 100,
    currency: 'EUR',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'status is 200': r => r.status === 200,
    'latency under 400ms': r => r.timings.duration < 400,
  });

  sleep(1);
}
