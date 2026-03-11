import {
    deleteWithFallback,
    getWithFallback,
    postWithFallback,
    putWithFallback,
} from "./requestWithFallback";


export const fetchPersonsApi = async () => {
    try {
        const response = await getWithFallback(["/persons", "/person"]);
        return response.data;
    } catch (error) {
        console.error("Error fetching persons", error);
        return [];
    }
};


export const createPersonApi = async (payload) => {
    try {
        const response = await postWithFallback(["/persons", "/person"], payload);
        return response.data;
    } catch (error) {
        console.error("Error creating person", error);
        throw error;
    }
};


export const updatePersonApi = async (id, payload) => {
    try {
        const response = await putWithFallback([`/persons/${id}`, `/person/${id}`], payload);
        return response.data;
    } catch (error) {
        console.error("Error updating person", error);
        throw error;
    }
};


export const deletePersonApi = async (id) => {
    try {
        const response = await deleteWithFallback([`/persons/${id}`, `/person/${id}`]);
        return response.data;
    } catch (error) {
        console.error("Error deleting person", error);
        throw error;
    }
};
