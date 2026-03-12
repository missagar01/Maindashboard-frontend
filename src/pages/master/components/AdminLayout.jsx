import { useState, useEffect, useRef } from "react"
import { LogOut, X, Construction, Settings } from 'lucide-react'
import { useNavigate } from "react-router-dom";
import HomePage from "../pages/AllUsers";
import AdminPage from "../pages/AdminPage";
import {
  fetchSystemsApi,
  createSystemApi,
  updateSystemApi,
  deleteSystemApi,
} from "../../../api/master/systemsApi";
import AllUserScore from "../pages/AllUserScore";
import { storage } from "../runtime";




// Under Construction Component
function UnderConstruction() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8 relative">
          <Construction className="w-32 h-32 mx-auto text-red-500 animate-bounce" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-red-100 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Under Construction
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          This module is currently being developed and will be available soon.
        </p>
      </div>
    </div>
  )
}


export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState("home")
  const [currentUrl, setCurrentUrl] = useState("")
  const [isIframeVisible, setIsIframeVisible] = useState(false)
  const [showUnderConstruction, setShowUnderConstruction] = useState(false)

  const navigate = useNavigate();
  const [systems, setSystems] = useState([]);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editSystem, setEditSystem] = useState(null);
  const [username, setUsername] = useState(() =>
    storage.get("user-name")
  );
  const isAdmin = ["admin", "aakash agrawal"].includes(username?.toLowerCase());
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [systemAccessList, setSystemAccessList] = useState([]);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const allUsersRef = useRef(null);
  const [showAllUserScore, setShowAllUserScore] = useState(false);





  const DEFAULT_SYSTEMS = ["CHECKLIST COMBINED"];


  const topNavRoutes = [
    {
      id: "HOME",
      label: "HOME",
      url: "",
    },
    ...systems.map((s) => ({
      id: s.systems,
      label: s.systems,
      url: s.link || "",
    })),
  ];


  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, 500);
  };


  // Function to handle route click
  const handleRouteClick = (url, id) => {
    setActiveRoute(id)

    // If it's the home route
    if (id.toUpperCase() === "HOME") {
      setIsIframeVisible(false)
      setShowUnderConstruction(false)
      setCurrentUrl("")
      return
    }

    // If URL is empty, show under construction
    if (!url || url.trim() === "") {
      setShowUnderConstruction(true)
      setIsIframeVisible(false)
      setCurrentUrl("")
    } else {
      // If URL exists, show iframe
      setCurrentUrl(url)
      setIsIframeVisible(true)
      setShowUnderConstruction(false)
    }
  }

  const handleLogout = () => {
    storage.clear();

    setUsername(null);
    setSystemAccessList([]);
    setSystems([]);

    window.location.replace("/login");
  };


  const loadSystems = async () => {
    const data = await fetchSystemsApi();
    setSystems(data);
  };

  useEffect(() => {
    loadSystems();
  }, []);


  useEffect(() => {
    // Retrieve saved state from localStorage on component mount
    const savedRoute = storage.get("activeRoute");
    const savedUrl = storage.get("currentUrl");

    if (savedRoute) {
      setActiveRoute(savedRoute);
    }

    if (savedUrl) {
      setCurrentUrl(savedUrl);
      setIsIframeVisible(!!savedUrl); // Show iframe if URL exists
    }
  }, []);

  useEffect(() => {
    storage.set("activeRoute", activeRoute);
    storage.set("currentUrl", currentUrl);
  }, [activeRoute, currentUrl]);

  useEffect(() => {
    if (isAdmin) {
      setSystemAccessList([]);
      return;
    }

    const storedAccess = storage.get("system_access");

    if (!storedAccess) {
      setSystemAccessList([]);
      return;
    }

    const accessArray = storedAccess
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);

    setSystemAccessList(accessArray);
  }, [isAdmin]);



  useEffect(() => {
    if (!username) {
      navigate("/login", { replace: true });
    }
  }, [username, navigate]);


  // Update the class dynamically based on activeRoute
  const getButtonClass = (routeId) => {
    return `px-4 py-3 text-sm font-medium whitespace-nowrap hover:bg-white/20 transition-all border-r border-white/10 ${activeRoute === routeId ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-lg" : ""
      }`;
  };

  // Ensure activeRoute is applied correctly on refresh
  useEffect(() => {
    const savedRoute = storage.get("activeRoute");
    if (savedRoute && savedRoute !== activeRoute) {
      setActiveRoute(savedRoute);
    }
  }, [activeRoute]);



  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden bg-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bgImage.png')" }}
    >

      <header className="bg-white/90 border-b border-gray-200 fixed top-0 left-0 right-0 w-full z-50 shadow-sm transition-all duration-300 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 md:gap-4 px-3 md:px-6 py-2">

          {/* LEFT: LOGO */}
          <div className="flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          </div>

          {/* CENTER: SYSTEM ACCESS LIST (SCROLLABLE TRAIN STYLE) */}
          <div className="hidden lg:flex flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-red-400 scrollbar-track-transparent">
            <div className="flex items-center gap-1 min-w-max">
              {topNavRoutes
                .filter((route) => {
                  const routeId = route.id.toUpperCase();
                  const usernameLower = username?.toLowerCase();

                  if (["admin", "aakash agrawal"].includes(usernameLower)) return true;
                  if (routeId === "HOME") return true;
                  if (DEFAULT_SYSTEMS.includes(routeId)) return true;
                  return systemAccessList.includes(routeId);
                })
                .map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleRouteClick(route.url, route.id)}
                    className={`px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-md transition
              ${activeRoute === route.id
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    {route.label}
                  </button>
                ))}
            </div>
          </div>

          {/* RIGHT: USER / ICONS */}
          <div className="ml-auto flex items-center gap-2">

            {/* Welcome (mobile + desktop) */}
            <span className="text-sm font-medium text-gray-700">
              Welcome, {username}
            </span>

            {/* MOBILE: SIDEBAR BUTTON */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-11 h-11 rounded-xl
            
             flex items-center justify-center
             active:scale-95 transition-all duration-200"
            >
              <div className="flex flex-col gap-[4px]">
                <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-red-600 to-orange-500"></span>
                <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-red-600 to-orange-500"></span>
                <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-red-600 to-orange-500"></span>
              </div>
            </button>


            {/* DESKTOP: ADMIN → SETTINGS | USER → LOGOUT */}
            {["admin", "aakash agrawal"].includes(username?.toLowerCase()) ? (
              <button
                className="hidden lg:flex w-10 h-10 bg-gray-700 hover:bg-gray-900 rounded-full items-center justify-center"
                onClick={() => setIsAdminSidebarOpen(true)}
              >
                <Settings className="text-white w-5 h-5" />
              </button>
            ) : (
              <button
                className="hidden lg:flex w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full items-center justify-center"
                onClick={handleLogout}
              >
                <LogOut className="text-white w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      </header>


      {/* MOBILE SIDEBAR (SYSTEMS + ADMIN ACTIONS) */}
      {
        isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
            {/* Overlay */}
            <div
              className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <div className="w-80 h-full bg-white/90 backdrop-blur-xl
                shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]
                flex flex-col
                rounded-l-3xl
                animate-slideInRight overflow-hidden">
              {/* HEADER */}
              <div className="px-6 py-5 border-b relative bg-gradient-to-r from-red-50 to-orange-50">

                {/* CLOSE ICON – TOP RIGHT */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
           rounded-full bg-white shadow
           hover:bg-gray-100 active:scale-95 transition"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>

                <p className="text-xs text-gray-500">Welcome</p>
                <p className="text-lg font-semibold text-gray-800">
                  {username}
                </p>
              </div>

              {/* MIDDLE CONTENT: SCROLLABLE */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                {/* SYSTEMS */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Systems
                  </p>

                  <div className="space-y-1">
                    {topNavRoutes
                      .filter((route) => {
                        const routeId = route.id.toUpperCase();
                        if (routeId === "HOME") return true;
                        if (isAdmin) return routeId !== "HOME";
                        if (DEFAULT_SYSTEMS.includes(routeId)) return true;
                        return systemAccessList.includes(routeId);
                      })
                      .map((route) => (
                        <button
                          key={route.id}
                          onClick={() => {
                            handleRouteClick(route.url, route.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
              transition-all duration-200
                    ${activeRoute === route.id
                              ? "bg-red-600 text-white shadow"
                              : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {route.label}
                        </button>
                      ))}
                  </div>
                </div>

                {isAdmin && activeRoute?.toUpperCase() === "HOME" && (
                  <div className="px-5 py-4 border-t">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                      Actions
                    </p>

                    <button
                      onClick={() => {
                        setShowAllUsersModal(true);
                        setShowAllUserScore(false);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 rounded-md text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Show All Users
                    </button>

                    <button
                      onClick={() => {
                        setShowAllUserScore(true);
                        setShowAllUsersModal(false);
                        setIsMobileMenuOpen(false);

                        requestAnimationFrame(() => {
                          allUsersRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        });
                      }}
                      className="w-full px-4 py-3 rounded-md text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      User Score Report
                    </button>

                    <button
                      onClick={() => {
                        setEditSystem(null);
                        setShowSystemModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 rounded-md text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Add / Edit Systems
                    </button>
                  </div>
                )}
              </div>

              {/* LOGOUT */}
              <div className="mt-auto px-5 py-4 border-t">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-md text-red-600 hover:bg-red-50 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )
      }



      {/* Main Content Layout */}
      <div className="flex flex-1 pt-[56px] md:pt-[64px] overflow-hidden">

        <main className="flex-1 overflow-y-auto bg-transparent">
          {!isIframeVisible && !showUnderConstruction && (
            <>
              {["admin", "aakash agrawal"].includes(username?.toLowerCase()) ? (
                <AdminPage
                  allUsersRef={allUsersRef}
                  showAllUsersModal={showAllUsersModal}
                  setShowAllUsersModal={setShowAllUsersModal}
                />
              ) : (
                <HomePage />
              )}

              {showAllUserScore && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
                  <div className="bg-white w-[95%] max-w-7xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                      <h2 className="text-xl font-bold text-gray-800">
                        User Score Report
                      </h2>

                      <button
                        onClick={() => setShowAllUserScore(false)}
                        className="text-2xl font-bold text-gray-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto">
                      <AllUserScore />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}


          {/* Show Under Construction */}
          {showUnderConstruction && <UnderConstruction />}

          {/* Show Iframe */}
          {isIframeVisible && currentUrl && (
            <div className="h-full flex flex-col">
              <div className="flex-1 relative">
                <iframe
                  id="external-iframe"
                  src={currentUrl}
                  className="w-full h-full border-0"
                  title="External Content"
                  // sandbox="allow-forms allow-modals allow-scripts allow-same-origin allow-storage-access-by-user-activation"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {
        showSystemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-md rounded p-6">
              <h2 className="text-xl font-bold mb-4">
                {editSystem ? "Edit System" : "Add System"}
              </h2>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingSystem(true);

                  try {
                    const systems = e.target.systems.value.trim();
                    const linkValue = e.target.link?.value?.trim();

                    const payload = {
                      systems,
                      ...(linkValue ? { link: linkValue } : { link: null }),
                    };

                    if (editSystem) {
                      await updateSystemApi(editSystem.id, payload);
                      showToast("System updated");
                    } else {
                      await createSystemApi(payload);
                      showToast("System added");
                    }

                    setShowSystemModal(false);
                    setEditSystem(null);
                    await loadSystems();
                  } catch (err) {
                    showToast("Action failed", "error");
                  } finally {
                    setIsSavingSystem(false);
                  }
                }}
                className="space-y-4"
              >
                <input
                  name="systems"
                  defaultValue={editSystem?.systems || ""}
                  placeholder="System Name"
                  className="w-full border p-2 rounded"
                  required
                />

                <input
                  name="link"
                  defaultValue={editSystem?.link || ""}
                  placeholder="System Link"
                  className="w-full border p-2 rounded"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSystemModal(false)}
                    className="px-4 py-2 border rounded"
                    disabled={isSavingSystem}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSystem}
                    className={`px-4 py-2 rounded text-white flex items-center gap-2
        ${isSavingSystem ? "bg-gray-400 cursor-not-allowed" : "bg-red-600"}
      `}
                  >
                    {isSavingSystem && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Save
                  </button>
                </div>
              </form>

            </div>
          </div>
        )
      }

      {
        showSystemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-2xl rounded p-6 overflow-y-auto max-h-[90vh]">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editSystem ? "Edit System" : "Manage Systems"}
                </h2>
                <button onClick={() => setShowSystemModal(false)}>
                  <X />
                </button>
              </div>

              {/* FORM */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingSystem(true);

                  try {
                    const systems = e.target.systems.value.trim();
                    const linkValue = e.target.link?.value?.trim();

                    const payload = {
                      systems,
                      ...(linkValue ? { link: linkValue } : { link: null }),
                    };

                    if (editSystem) {
                      await updateSystemApi(editSystem.id, payload);
                      showToast("System updated");
                    } else {
                      await createSystemApi(payload);
                      showToast("System added");
                    }

                    e.target.reset();
                    setEditSystem(null);
                    await loadSystems();
                  } catch (err) {
                    showToast("Action failed", "error");
                  } finally {
                    setIsSavingSystem(false);
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
              >
                <input
                  name="systems"
                  defaultValue={editSystem?.systems || ""}
                  placeholder="System Name"
                  className="border p-2 rounded"
                  required
                />

                <input
                  name="link"
                  defaultValue={editSystem?.link || ""}
                  placeholder="System Link"
                  className="border p-2 rounded"
                />

                <div className="md:col-span-2 flex justify-end gap-3">
                  {editSystem && (
                    <button
                      type="button"
                      onClick={() => setEditSystem(null)}
                      className="px-4 py-2 border rounded"
                      disabled={isSavingSystem}
                    >
                      Cancel Edit
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingSystem}
                    className={`px-4 py-2 rounded text-white flex items-center gap-2
        ${isSavingSystem ? "bg-gray-400 cursor-not-allowed" : "bg-red-600"}
      `}
                  >
                    {isSavingSystem && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {editSystem ? "Update" : "Add"}
                  </button>
                </div>
              </form>


              {/* SYSTEM LIST */}
              <table className="w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">System</th>
                    <th className="p-2 text-left">Link</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {systems.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{s.systems}</td>
                      <td className="p-2 text-blue-600 underline">
                        <a href={s.link} target="_blank" rel="noreferrer">
                          {s.link}
                        </a>
                      </td>
                      <td className="p-2 text-center space-x-3">
                        <button
                          onClick={() => setEditSystem(s)}
                          className="text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Delete this system?")) {
                              await deleteSystemApi(s.id);
                              loadSystems();
                            }
                          }}
                          className="text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        )
      }

      {
        toast.show && (
          <div
            className={`fixed top-5 right-5 z-[9999] px-4 py-2 rounded shadow-lg text-white text-sm
      ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}
    `}
          >
            {toast.message}
          </div>
        )
      }

      {
        isAdminSidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="flex-1 bg-black/50"
              onClick={() => setIsAdminSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div className="w-72 bg-white shadow-xl p-5 flex flex-col">
              <h2 className="text-lg font-bold mb-6 border-b pb-3">
                Admin Settings
              </h2>

              {/* All Users */}
              <button
                onClick={() => {
                  // setActiveRoute("HOME");
                  // setIsIframeVisible(false);
                  // setShowUnderConstruction(false);
                  // setCurrentUrl("");
                  setShowAllUsersModal(true);
                  setShowAllUserScore(false);
                  setIsAdminSidebarOpen(false);

                  requestAnimationFrame(() => {
                    allUsersRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }}
                className="text-left px-4 py-3 rounded hover:bg-gray-100 font-medium"
              >
                Show All Users
              </button>

              <button
                onClick={() => {
                  setShowAllUserScore(true);
                  setShowAllUsersModal(false); // close modal if open
                  setIsAdminSidebarOpen(false);

                  requestAnimationFrame(() => {
                    allUsersRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }}
                className="text-left px-4 py-3 rounded hover:bg-gray-100 font-medium"
              >
                User Score Report
              </button>

              {/* Add / Edit Systems */}
              <button
                onClick={() => {
                  setEditSystem(null);
                  setShowSystemModal(true);
                  setIsAdminSidebarOpen(false);
                }}
                className="text-left px-4 py-3 rounded hover:bg-gray-100 font-medium"
              >
                Add / Edit Systems
              </button>

              <div className="flex-1" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )
      }

    </div >
  )
}
