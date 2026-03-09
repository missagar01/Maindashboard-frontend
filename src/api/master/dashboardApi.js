import axiosClient from "./axiosClient";

const extractCount = (payload) => {
    if (typeof payload === "number") {
        return payload;
    }

    if (typeof payload === "string") {
        const parsed = Number(payload);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    if (payload && typeof payload === "object") {
        if (typeof payload.count === "number") {
            return payload.count;
        }

        if (typeof payload.count === "string") {
            const parsed = Number(payload.count);
            return Number.isFinite(parsed) ? parsed : 0;
        }
    }

    return 0;
};

export const getPendingTodayApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/pendingtoday", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch pending today tasks", err);
        return 0;
    }
};

export const getCompletedTodayApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/completedtoday", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch completed today tasks", err);
        return 0;
    }
};

export const getTotalTaskApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/total", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch total tasks", err);
        return 0;
    }
};

export const getCompletedTaskApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/completed", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch completed tasks", err);
        return 0;
    }
};

export const getPendingTaskApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/pending", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch pending tasks", err);
        return 0;
    }
};

export const getOverdueTaskApi = async ({
    dashboardType,
    role,
    username,
    staffFilter = "all",
    departmentFilter = "all",
}) => {
    try {
        const res = await axiosClient.get("/dashboard/overdue", {
            params: {
                dashboardType,
                role,
                username,
                staffFilter,
                departmentFilter,
            },
        });

        return extractCount(res.data);
    } catch (err) {
        console.error("Failed to fetch overdue tasks", err);
        return 0;
    }
};

