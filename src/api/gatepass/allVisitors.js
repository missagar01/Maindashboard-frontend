import { getWithFallback } from "./requestWithFallback";

export const fetchAllVisitorsApi = async () => {
    try {
        const response = await getWithFallback(["/requests/admin", "/request/admin", "/visits/admin"]);
        return response.data;
    } catch (error) {
        console.error("Error fetching persons", error);
        return [];
    }
};
