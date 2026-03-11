import { getWithFallback, patchWithFallback } from "./requestWithFallback";

export const fetchGatePassesApi = () =>
    getWithFallback(["/close-pass", "/close", "/gatepass"]);

export const closeGatePassApi = (id) =>
    patchWithFallback([`/close-pass/${id}`, `/close/${id}`, `/gatepass/${id}`]);
