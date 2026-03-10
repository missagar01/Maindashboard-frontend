import { useEffect, useMemo, useRef, useState } from "react";
import { fetchUserScoresApi } from "../api/userScoreApi";
import { apiCache } from "../utils/apiCache";

/* -------------------- UTILITIES -------------------- */

const formatDate = (d) => d.toISOString().split("T")[0];

const buildMonthOptions = (count = 7) => {
    const today = new Date();

    // Always anchor to CURRENT month (auto-updates when month changes)
    const baseMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return Array.from({ length: count }).map((_, i) => {
        // Go backwards from current month
        const date = new Date(
            baseMonth.getFullYear(),
            baseMonth.getMonth() - i,
            1
        );

        const isCurrentMonth =
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        return {
            key: `${date.getFullYear()}-${date.getMonth()}`,
            label: date.toLocaleString("default", {
                month: "long",
                year: "numeric",
            }),
            startDate: formatDate(
                new Date(date.getFullYear(), date.getMonth(), 1)
            ),
            endDate: isCurrentMonth
                ? formatDate(today)
                : formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 1)),
        };
    });
};


const scoreBadge = (value) => {
    if (value >= 0) return "bg-emerald-100 text-emerald-700";
    if (value > -50) return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
};

/* -------------------- COMPONENT -------------------- */

const AllUserScore = () => {
    const abortRef = useRef(null);

    const monthOptions = useMemo(() => buildMonthOptions(7), []);
    const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [departmentFilter, setDepartmentFilter] = useState("");
    const [doerFilter, setDoerFilter] = useState("");

    /* -------------------- FETCH -------------------- */

    useEffect(() => {
        if (!selectedMonth?.startDate || !selectedMonth?.endDate) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError("");

                const cacheKey = `scores_${selectedMonth.startDate}_${selectedMonth.endDate}`;
                let data = apiCache.get(cacheKey);

                if (!data) {
                    const res = await fetchUserScoresApi({
                        startDate: selectedMonth.startDate,
                        endDate: selectedMonth.endDate,
                    });

                    if (!res || !Array.isArray(res.data)) {
                        throw new Error("Invalid API response");
                    }
                    data = res.data;
                    apiCache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes TTL
                }

                setScores(data);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error(err);
                    setError("Failed to load user scores.");
                    setScores([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [selectedMonth]);

    useEffect(() => {
        setDoerFilter("");
    }, [departmentFilter]);

    /* -------------------- DROPDOWNS -------------------- */

    const departments = useMemo(
        () => [...new Set(scores.map((s) => s.department).filter(Boolean))],
        [scores]
    );

    const doers = useMemo(() => {
        const filtered = departmentFilter
            ? scores.filter((s) => s.department === departmentFilter)
            : scores;

        return [
            ...new Set(
                filtered
                    .map((s) => s.doer)
                    .filter((d) => d && d !== "TOTAL")
            ),
        ].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    }, [scores, departmentFilter]);

    /* -------------------- FILTERED DATA -------------------- */

    const filteredScores = useMemo(() => {
        return scores.filter((row) => {
            if (departmentFilter && row.department !== departmentFilter) return false;
            if (doerFilter && row.doer !== doerFilter) return false;
            return true;
        });
    }, [scores, departmentFilter, doerFilter]);

    /* -------------------- RENDER -------------------- */

    return (
        <div className="p-6 bg-slate-100 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">


                {/* <h1 className="text-2xl font-bold text-gray-800">
                    User Score Report
                </h1> */}

                {/* FILTER CARD */}
                <div className="bg-white rounded-2xl shadow-md p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            disabled={loading}
                            value={selectedMonth.key}
                            onChange={(e) =>
                                setSelectedMonth(
                                    monthOptions.find((m) => m.key === e.target.value)
                                )
                            }
                            className="h-11 px-3 rounded-xl border border-gray-300 bg-white
                         focus:ring-2 focus:ring-indigo-500"
                        >
                            {monthOptions.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {m.label}
                                </option>
                            ))}
                        </select>

                        <select
                            disabled={loading}
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="h-11 px-3 rounded-xl border border-gray-300 bg-white
                         focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>

                        <select
                            disabled={loading}
                            value={doerFilter}
                            onChange={(e) => setDoerFilter(e.target.value)}
                            className="h-11 px-3 rounded-xl border border-gray-300 bg-white
                         focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Users</option>
                            {doers.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => {
                                setDepartmentFilter("");
                                setDoerFilter("");
                            }}
                            className="h-11 rounded-xl bg-gray-100 hover:bg-gray-200
                         font-medium text-gray-700 transition"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700
                          rounded-xl px-4 py-3 shadow-sm">
                        {error}
                    </div>
                )}

                {/* DATA */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            Loading user scores…
                        </div>
                    ) : filteredScores.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No data available
                        </div>
                    ) : (
                        <>
                            {/* ===== DESKTOP / TABLET TABLE ===== */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                        <tr>
                                            <th className="px-5 py-4 text-left font-semibold text-gray-600">
                                                Department
                                            </th>
                                            <th className="px-5 py-4 text-left font-semibold text-gray-600">
                                                User
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold text-gray-600 lg:table-cell hidden">
                                                Total
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold text-gray-600 lg:table-cell hidden">
                                                Completed
                                            </th>
                                            <th className="px-5 py-4 text-right font-semibold text-gray-600 lg:table-cell hidden">
                                                On Time
                                            </th>
                                            <th className="px-5 py-4 text-center font-semibold text-gray-600">
                                                Total Score
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {filteredScores.map((row, idx) => (
                                            <tr
                                                key={`${row.department}-${row.doer}`}
                                                className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                                    } hover:bg-indigo-50 transition`}
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="px-3 py-1 rounded-full bg-gray-200 text-xs font-medium">
                                                        {row.department}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-gray-800">
                                                    {row.doer}
                                                </td>

                                                <td className="px-5 py-4 text-right lg:table-cell hidden">
                                                    {row.total_tasks}
                                                </td>

                                                <td className="px-5 py-4 text-right text-emerald-600 lg:table-cell hidden">
                                                    {row.total_completed_tasks}
                                                </td>

                                                <td className="px-5 py-4 text-right text-indigo-600 lg:table-cell hidden">
                                                    {row.total_done_on_time}
                                                </td>

                                                <td className="px-5 py-4 text-center">
                                                    <span
                                                        className={`px-4 py-1.5 rounded-full text-sm font-bold ${scoreBadge(
                                                            row.total_score
                                                        )}`}
                                                    >
                                                        {row.total_score}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ===== MOBILE CARDS ===== */}
                            <div className="md:hidden space-y-4 p-4 bg-gray-50">
                                {filteredScores.map((row) => (
                                    <div
                                        key={`${row.department}-${row.doer}`}
                                        className="bg-white rounded-xl shadow-md p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs px-3 py-1 rounded-full bg-gray-200">
                                                {row.department}
                                            </span>

                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-bold ${scoreBadge(
                                                    row.total_score
                                                )}`}
                                            >
                                                {row.total_score}%
                                            </span>
                                        </div>

                                        <div className="text-gray-800 font-semibold">
                                            {row.doer}
                                        </div>

                                        <div className="grid grid-cols-3 text-xs text-gray-600 pt-2 border-t">
                                            <div>
                                                <p className="font-medium text-gray-500">Total</p>
                                                <p>{row.total_tasks}</p>
                                            </div>

                                            <div>
                                                <p className="font-medium text-gray-500">Completed</p>
                                                <p className="text-emerald-600">
                                                    {row.total_completed_tasks}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="font-medium text-gray-500">On Time</p>
                                                <p className="text-indigo-600">
                                                    {row.total_done_on_time}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllUserScore;
