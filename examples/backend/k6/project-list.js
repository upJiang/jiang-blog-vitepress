import http from 'k6/http'
import { check } from 'k6'

export const options = {
  scenarios: {
    list_projects: { executor: 'constant-arrival-rate', rate: 10, timeUnit: '1s', duration: '30s', preAllocatedVUs: 5, maxVUs: 20 },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
}

export default function () {
  const response = http.get(`${__ENV.BASE_URL || 'http://localhost:3001'}/api/projects?limit=50`, {
    headers: { Authorization: `Bearer ${__ENV.ACCESS_TOKEN || 'local-test-token'}` },
  })
  check(response, { 'list response is observable': (value) => [200, 401].includes(value.status) })
}
