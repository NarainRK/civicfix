
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    civicfix_load: {
      executor: "shared-iterations",
      vus: 50,
      iterations: 1000,
      maxDuration: "3m"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.05"]
  }
};

export default function () {
  const response = http.get("http://localhost:8080/api/issues", {
    headers: {
      Authorization: `Bearer ${__ENV.CIVICFIX_TOKEN}`
    },
    tags: { name: "GET /api/issues" }
  });

  check(response, {
    "status is 200": (r) => r.status === 200
  });
}
