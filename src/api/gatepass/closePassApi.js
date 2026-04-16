import { getWithFallback, patchWithFallback } from "./requestWithFallback";

export const fetchGatePassesApi = (personToMeet, showAll = false) =>
    getWithFallback(["/close-pass", "/close", "/gatepass"], {
        params: { personToMeet, showAll },
    });

export const closeGatePassApi = (id, personToMeet, closedBy, showAll = false) =>
    patchWithFallback(
        [`/close-pass/${id}`, `/close/${id}`, `/gatepass/${id}`],
        { personToMeet, closedBy, showAll }
    );
