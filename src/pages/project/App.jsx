import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Building2, HardHat, ClipboardList, BarChart3, Plus, Search, MapPin, Calendar, CheckCircle2, AlertCircle, Warehouse, Settings, Menu, X, LogOut, Shield, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

import ProjectModal from './components/ProjectModal';
import DPRForm from './components/DPRForm';
import MaterialInventory from './components/MaterialInventory';
import BOQBuilder from './components/BOQBuilder';
import LoginPage from './components/LoginPage';
import DataTable from './components/DataTable';
import UserManagement from './components/UserManagement';
import PasswordResetModal from './components/PasswordResetModal';
import DirectorStats from './components/DirectorStats';
import { formatDate } from './utils/dateUtils';

const App = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/projects`, {
        headers: { 'x-auth-token': token }
      });
      setProjects(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const projectColumns = [
    { key: 'project_name', label: 'Project Name', render: (val) => <span className="font-bold text-accent">{val}</span> },
    { key: 'location', label: 'Location' },
    { key: 'client_name', label: 'Client' },
    {
      key: 'start_date',
      label: 'Timeline',
      render: (_, row) => (
        <span className="text-xs">
          {formatDate(row.start_date)} -
          {formatDate(row.expected_end_date)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase tracking-wider">
          Running
        </span>
      )
    }
  ];

  return (
    <Router>
      <div className="min-h-screen flex">
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onProjectCreated={fetchProjects}
        />
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-40 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 group px-2 py-1">
              <div className="bg-gradient-to-br from-amber-400 to-red-500 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 group-hover:rotate-12 transition-transform duration-500">
                <HardHat size={22} className="text-white" />
              </div>
              <h1 className="font-black text-xl tracking-tighter text-slate-900 leading-none">
                CIVIL<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600">TRACK</span>
              </h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-amber-50 to-white border-l-4 border-amber-500 text-slate-900 shadow-sm' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
            >
              <BarChart3 size={18} className={activeTab === 'dashboard' ? 'text-amber-500' : ''} />
              <span className="font-bold text-xs uppercase tracking-widest">Dashboard</span>
            </button>
            <button
              onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'projects' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
            >
              <Building2 size={20} />
              <span className="font-medium">Projects</span>
            </button>
            <button
              onClick={() => { setActiveTab('dpr'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dpr' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
            >
              <ClipboardList size={20} />
              <span className="font-medium">Daily Logs (DPR)</span>
            </button>
            <button
              onClick={() => { setActiveTab('materials'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'materials' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
            >
              <Warehouse size={20} />
              <span className="font-medium">Material Stock</span>
            </button>
            {(user.role === 'admin' || user.role === 'manager') && (
              <button
                onClick={() => { setActiveTab('setup'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'setup' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
              >
                <Settings size={20} />
                <span className="font-medium">Project Setup</span>
              </button>
            )}
            {user.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
              >
                <Shield size={20} />
                <span className="font-medium">Users</span>
              </button>
            )}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-accent text-xs font-bold border border-slate-200">
                {user.name ? user.name.charAt(0) : user.user_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name || user.user_name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-medium">{user.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {user.role === 'admin' && (
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs font-medium border border-slate-200"
                  title="Reset Password"
                >
                  <Lock size={14} />
                  <span>Reset</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-colors text-xs font-medium border border-red-100 ${user.role !== 'admin' ? 'col-span-2' : ''}`}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        <PasswordResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          user={user}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto lg:ml-64">
          <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 bg-white/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-accent p-1">
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2 text-slate-500 text-sm md:text-base font-medium">
                <span className="capitalize">{activeTab}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900">Overview</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative hidden md:block group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none w-32 lg:w-48 transition-all"
                />
              </div>
              {(user.role === 'admin' || user.role === 'manager') && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="bg-accent p-2 rounded-full text-white hover:bg-accent-dark transition-colors shadow-sm"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          </header>

          <div className="p-4 md:p-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <DirectorStats />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <StatCard title="Total Concrete" value="1,240 m³" icon={<HardHat size={20} />} trend="+12% this month" progress={65} color="amber" />
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <StatCard title="Steel Consumed" value="450 MT" icon={<Building2 size={20} />} trend="Ahead of schedule" progress={42} color="blue" />
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <StatCard title="Labor Strength" value="184" icon={<ClipboardList size={20} />} trend="Peak mobilization" progress={88} color="green" />
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                    <StatCard title="Material Cost" value="₹4.2M" icon={<BarChart3 size={20} />} trend="Within budget" progress={15} color="red" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="industrial-card">
                    <h3 className="text-lg font-bold mb-6 text-slate-900">Cumulative Progress (S-Curve)</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="actual" stroke="#f59e0b" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                          <Area type="monotone" dataKey="planned" stroke="#cbd5e1" strokeDasharray="5 5" fill="transparent" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <DataTable
                  title="Project Inventory"
                  columns={projectColumns}
                  data={projects}
                />
              </div>
            )}

            {activeTab === 'projects' && (
              <DataTable
                title="Manage Projects"
                columns={projectColumns}
                data={projects}
              />
            )}

            {activeTab === 'dpr' && <DPRForm projects={projects} />}
            {activeTab === 'materials' && <MaterialInventory />}
            {activeTab === 'setup' && <BOQBuilder projects={projects} />}
            {activeTab === 'users' && <UserManagement />}
          </div>
        </main>
      </div>
    </Router>
  );
};


const StatCard = ({ title, value, icon, trend, progress, color = 'amber' }) => {
  const glowClasses = {
    amber: 'stat-glow-amber',
    blue: 'stat-glow-blue',
    green: 'stat-glow-green',
    red: 'stat-glow-red'
  };

  return (
    <div className={`industrial-card relative overflow-hidden group ${glowClasses[color]}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg transition-all duration-300 border border-slate-100">
          <div className={`text-${color}-500`}>{icon}</div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">{title}</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
          <span>Utilization</span>
          <span className="text-slate-900">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${color === 'amber' ? 'from-amber-400 to-amber-600' : color === 'blue' ? 'from-blue-400 to-blue-600' : color === 'green' ? 'from-green-400 to-green-600' : 'from-red-400 to-red-600'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-slate-400 italic">
          <div className={`w-1 h-4 rounded-full ${color === 'amber' ? 'bg-amber-500' : color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {trend}
        </div>
      </div>
    </div>
  );
};

const chartData = [
  { name: 'Jan', planned: 0, actual: 0 },
  { name: 'Feb', planned: 0, actual: 0 },
  { name: 'Mar', planned: 0, actual: 0 },
];

export default App;
