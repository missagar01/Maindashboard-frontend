import axiosClient from "./axiosClient";

export const fetchAttendanceSummaryApi = async (
    fromDate,
    toDate
) => {
    try {
        const params = {};

        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const res = await axiosClient.get("/attendence", { params });

        return { data: res.data };
    } catch (err) {
        return {
            error:
                err.response?.data?.message ||
                "Failed to fetch attendance data",
        };
    }
};
