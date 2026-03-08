import { useEffect, useState } from "react";
import { Users, Loader, Edit, Eye, EyeOff } from "lucide-react";
import Heading from "../../components/element/Heading";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { settingsApi } from "@/api/store/storeSettingsApi";

/* ================= TYPES ================= */

type UserRow = {
    id: number;
    employee_id?: string;
    user_name?: string;
    store_access?: string;
    password?: string;
    role?: string;
    user_access?: string;
};

/* ================= CONSTANTS ================= */

const STORE_ACCESS_OPTIONS = [
    "Indent",
    "Purchase Order",
    "Inventory",
    "Repair Gate Pass",
    "Repair Follow Up",
    "Store GRN",
    "Store GRN Admin Approval",
    "Store GRN GM Approval",
    "Store GRN Close",
];

/* ================= COMPONENT ================= */

export default function Settings() {
    const [rows, setRows] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [showPopup, setShowPopup] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [storeAccessList, setStoreAccessList] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);

    // 👁 password visibility per row
    const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

    /* ================= FETCH USERS ================= */

    useEffect(() => {
        let active = true;

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await settingsApi.getUsers();
                if (!active) return;

                const users = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];

                setRows(users);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load users");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
        return () => {
            active = false;
        };
    }, []);

    /* ================= SEARCH ================= */

    const query = search.trim().toLowerCase();
    const filteredRows = query
        ? rows.filter(
            (u) =>
                u.employee_id?.toLowerCase().includes(query) ||
                u.user_name?.toLowerCase().includes(query)
        )
        : rows;

    const totalUsers = filteredRows.length;

    /* ================= STORE ACCESS HANDLERS ================= */

    const addStoreAccess = (value: string) => {
        setStoreAccessList((prev) =>
            prev.includes(value) ? prev : [...prev, value]
        );
    };

    const removeStoreAccess = (value: string) => {
        setStoreAccessList((prev) => prev.filter((v) => v !== value));
    };

    /* ================= SAVE ================= */

    const handleSave = async () => {
        if (!selectedUser) return;

        setProcessing(true);
        try {
            const res = await settingsApi.patchStoreAccess(
                selectedUser.id,
                storeAccessList.join(",")
            );

            const updatedUser = (res as any)?.data ?? res;

            if (updatedUser) {
                toast.success("Store access updated");

                setRows((prev) =>
                    prev.map((u) =>
                        u.id === selectedUser.id ? { ...u, ...updatedUser } : u
                    )
                );

                setShowPopup(false);
                setSelectedUser(null);
                setStoreAccessList([]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update store access");
        } finally {
            setProcessing(false);
        }
    };

    /* ================= PASSWORD TOGGLE ================= */

    const togglePassword = (id: number) => {
        setVisiblePasswords((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    /* ================= UI ================= */

    return (
        <div className="w-full p-4 md:p-6 lg:p-8">
            <Heading
                heading={`User Settings (${totalUsers})`}
                subtext="Manage user access and permissions"
            >
                <Users size={48} className="text-primary" />
            </Heading>

            {/* SEARCH */}
            <div className="mb-4 flex justify-end">
                <Input
                    className="w-full max-w-md"
                    placeholder="Search Employee ID / User Name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* TABLE */}
            <div className="relative overflow-x-auto border rounded-xl bg-white shadow-sm">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader className="animate-spin" />
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">No users found</div>
                ) : (
                    <table className="w-full min-w-[1100px] text-sm border-collapse">
                        <thead className="sticky top-0 bg-slate-100 border-b">
                            <tr>
                                <th className="px-3 py-2 text-left">Action</th>
                                <th className="px-3 py-2 text-left">Employee ID</th>
                                <th className="px-3 py-2 text-left">User Name</th>
                                <th className="px-3 py-2 text-left">Password</th>
                                <th className="px-3 py-2 text-left">Role</th>
                                <th className="px-3 py-2 text-left">Department</th>
                                <th className="px-3 py-2 text-left">Store Access</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map((user) => (
                                <tr key={user.id} className="border-b even:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setStoreAccessList(
                                                    user.store_access
                                                        ? user.store_access.split(",").map((v) => v.trim())
                                                        : []
                                                );
                                                setShowPopup(true);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            <Edit size={14} className="mr-1" /> Edit
                                        </Button>
                                    </td>

                                    <td className="px-3 py-2">{user.employee_id || "—"}</td>
                                    <td className="px-3 py-2">{user.user_name || "—"}</td>

                                    <td className="px-3 py-2 flex items-center gap-2">
                                        <span>
                                            {visiblePasswords[user.id]
                                                ? user.password || "—"
                                                : "****"}
                                        </span>
                                        {user.password && (
                                            <button onClick={() => togglePassword(user.id)}>
                                                {visiblePasswords[user.id] ? (
                                                    <EyeOff size={16} />
                                                ) : (
                                                    <Eye size={16} />
                                                )}
                                            </button>
                                        )}
                                    </td>

                                    <td className="px-3 py-2">{user.role || "—"}</td>
                                    <td className="px-3 py-2">{user.user_access || "—"}</td>
                                    <td className="px-3 py-2">{user.store_access || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* POPUP */}
            {showPopup && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg w-full max-w-md p-5 shadow-lg">
                        <h3 className="text-lg font-semibold mb-3">Edit Store Access</h3>

                        {/* DROPDOWN */}
                        <select
                            className="w-full border rounded-md px-3 py-2 mb-3"
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    addStoreAccess(e.target.value);
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="" disabled>
                                Add system access
                            </option>
                            {STORE_ACCESS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        {/* CHIPS */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {storeAccessList.map((value) => (
                                <span
                                    key={value}
                                    className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                >
                                    {value}
                                    <button
                                        onClick={() => removeStoreAccess(value)}
                                        className="text-red-500"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowPopup(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={processing}
                                className="bg-blue-600 text-white"
                            >
                                {processing ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
