"use client"
import { useState, useEffect } from "react"
import { Loader2, RefreshCw, ChevronDown, X, Search, Package } from "lucide-react"
import * as o2dAPI from "../../api/o2dAPI";

export function OrdersView() {
  const [pendingOrders, setPendingOrders] = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("pending")

  const [filters, setFilters] = useState({
    salesperson: '',
    customer: '',
    item: '',
    search: ''
  })

  const [filterOptions, setFilterOptions] = useState({
    salespersons: [],
    customers: [],
    items: []
  })

  const [showFilters, setShowFilters] = useState(false)

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      setError(null)

      const pendingResponse = await o2dAPI.getPendingOrders()
      const pendingResult = pendingResponse.data

      const historyResponse = await o2dAPI.getCompletedOrders()
      const historyResult = historyResponse.data

      if (!pendingResult.success || !historyResult.success) {
        throw new Error(pendingResult.message || historyResult.message || 'Failed to fetch data')
      }

      const pendingRows = pendingResult.data || []
      const historyRows = historyResult.data || []

      const processRows = (rows, statusType) => {
        return rows.map((row: any, index: number) => {
          const getField = (key: string) => row[key] || row[key.toUpperCase()] || row[key.toLowerCase()] || '';
          const vrDate = getField('vrdate');
          let formattedDateTime = vrDate;
          if (vrDate) {
            const dateObj = new Date(vrDate);
            if (!isNaN(dateObj.getTime())) {
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const year = String(dateObj.getFullYear()).slice(-2);
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
            }
          }
          let balance = 0;
          if (statusType === 'Pending') {
            balance = parseFloat(getField('balance_qty') || getField('balanceqty')) || 0;
          }
          return {
            id: `${statusType}-${index}-${getField('vrno')}`,
            salesperson: getField('sales_person') || getField('salesperson') || '',
            customerName: getField('customer_name') || getField('customername') || '',
            vrno: getField('vrno'),
            date: formattedDateTime,
            itemName: getField('item_name') || getField('itemname') || '',
            remarks: getField('remark') || getField('remarks') || '',
            priority: getField('priority') || '',
            rate: getField('rate') || '',
            balanceQty: balance,
            status: statusType
          }
        })
      }

      const pending = processRows(pendingRows, 'Pending');
      const history = processRows(historyRows, 'History');
      const allOrders = [...pending, ...history];
      const salespersons = [...new Set(allOrders.map(order => order.salesperson).filter(Boolean))].sort()

      setFilterOptions({ salespersons, customers: [], items: [] })
      setPendingOrders(pending)
      setHistoryOrders(history)
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredCustomers = (orders: any[]): string[] => {
    let filteredOrders = orders;
    if (filters.salesperson) filteredOrders = orders.filter(o => o.salesperson === filters.salesperson);
    return [...new Set(filteredOrders.map(o => o.customerName).filter(Boolean))] as string[];
  }

  const getFilteredItems = (orders: any[]): string[] => {
    let filteredOrders = orders;
    if (filters.salesperson) filteredOrders = filteredOrders.filter(o => o.salesperson === filters.salesperson);
    if (filters.customer) filteredOrders = filteredOrders.filter(o => o.customerName === filters.customer);
    return [...new Set(filteredOrders.map(o => o.itemName).filter(Boolean))] as string[];
  }

  const handleSalespersonChange = (value: string) => {
    setFilters({ ...filters, salesperson: value, customer: '', item: '' });
  }

  const handleCustomerChange = (value: string) => {
    setFilters({ ...filters, customer: value, item: '' });
  }

  const filterOrders = (orders) => {
    return orders.filter(order => {
      if (filters.salesperson && order.salesperson !== filters.salesperson) return false
      if (filters.customer && order.customerName !== filters.customer) return false
      if (filters.item && order.itemName !== filters.item) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const match =
          (order.vrno || '').toLowerCase().includes(s) ||
          (order.customerName || '').toLowerCase().includes(s) ||
          (order.itemName || '').toLowerCase().includes(s) ||
          (order.remarks || '').toLowerCase().includes(s)
        if (!match) return false
      }
      return true
    })
  }

  const getFilteredBalanceTotal = (orders) => {
    return filterOrders(orders).reduce((sum, order) => sum + (order.balanceQty || 0), 0);
  }

  const hasActiveFilters = filters.salesperson || filters.customer || filters.item || filters.search;

  useEffect(() => { fetchOrderData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] w-full">
        <div className="flex flex-col items-center space-y-3 p-6 bg-white rounded-xl shadow-lg">
          <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-600">Loading Orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Orders</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-800">Error loading data</h3>
          <p className="mt-1 text-xs text-red-700">{error}</p>
          <button onClick={fetchOrderData} className="mt-2 text-xs bg-red-100 text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">Retry</button>
        </div>
      </div>
    )
  }

  const renderTable = (data, type) => {
    const filteredData = filterOrders(data);
    const isPending = type === 'pending';

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 capitalize truncate">{type} Orders</h3>
                <p className="text-gray-400 text-[10px] hidden sm:block">Track {type} status orders</p>
              </div>
            </div>
            <div className="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-50 rounded-lg border border-blue-100 text-right">
              <span className="text-blue-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block">Total Balance</span>
              <div className="text-sm sm:text-lg font-black text-blue-800 tabular-nums leading-tight">
                {getFilteredBalanceTotal(data).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Compact single row on mobile */}
        <div className="p-2 sm:p-4 bg-white border-b border-gray-100">
          {/* Search always visible */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Search VR No, Customer, Item..."
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors flex-shrink-0 ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <span>Filters</span>
              {hasActiveFilters && !showFilters && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {[filters.salesperson, filters.customer, filters.item].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ salesperson: '', customer: '', item: '', search: '' })}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold transition-colors"
              >
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Expandable filter dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100">
              {/* Salesperson */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Salesperson</label>
                <div className="relative">
                  <select
                    value={filters.salesperson}
                    onChange={(e) => handleSalespersonChange(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">All Salespersons</option>
                    {filterOptions.salespersons.map((sp, i) => (
                      <option key={i} value={sp}>{sp}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Customer */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</label>
                <div className="relative">
                  <select
                    value={filters.customer}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">All Customers</option>
                    {getFilteredCustomers(data).map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Item */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Item</label>
                <div className="relative">
                  <select
                    value={filters.item}
                    onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                    className="w-full pl-2.5 pr-7 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">All Items</option>
                    {getFilteredItems(data).map((it, i) => (
                      <option key={i} value={it}>{it}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filters.salesperson && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                  {filters.salesperson}
                  <button onClick={() => setFilters({ ...filters, salesperson: '', customer: '', item: '' })}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.customer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full">
                  {filters.customer}
                  <button onClick={() => setFilters({ ...filters, customer: '', item: '' })}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.item && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
                  {filters.item}
                  <button onClick={() => setFilters({ ...filters, item: '' })}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-full">
                  "{filters.search}"
                  <button onClick={() => setFilters({ ...filters, search: '' })}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="px-3 py-1.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-700">{filteredData.length}</span> of <span className="font-bold text-gray-700">{data.length}</span> orders
          </span>
        </div>

        {/* ── Mobile: Card Layout ── */}
        <div className="block sm:hidden">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">No orders found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredData.map((order, index) => (
                <div key={order.id} className="p-3 hover:bg-blue-50/20 transition-colors">
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{order.customerName || '—'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{order.salesperson || '—'}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full border ${isPending ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                        {order.status}
                      </span>
                      {order.priority === 'PRIORITY' && (
                        <span className="inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200">🔴 PRIORITY</span>
                      )}
                    </div>
                  </div>

                  {/* Card Detail Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-7">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">VR No</span>
                      <p className="text-[10px] font-mono font-semibold text-gray-700">{order.vrno || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Date</span>
                      <p className="text-[10px] text-gray-700 tabular-nums">{order.date || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Item</span>
                      <p className="text-[10px] text-gray-700 truncate">{order.itemName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Rate</span>
                      <p className="text-[10px] font-semibold text-gray-700">{order.rate ? `₹${order.rate}` : '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Balance Qty</span>
                      <p className="text-xs font-black text-blue-700 tabular-nums">
                        {typeof order.balanceQty === 'number' ? order.balanceQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : order.balanceQty}
                      </p>
                    </div>
                    {order.remarks && (
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Remarks</span>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{order.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Desktop: Table Layout ── */}
        <div className="hidden sm:block overflow-x-auto" style={{ maxHeight: '520px', overflowY: 'auto' }}>
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/80 sticky top-0 z-10 shadow-sm">
              <tr>
                {['#', 'Salesperson', 'Customer', 'VR No', 'Date', 'Item', 'Remarks', 'Priority', 'Rate', 'Balance Qty', 'Status'].map(h => (
                  <th key={h} className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredData.length > 0 ? (
                filteredData.map((order, index) => (
                  <tr key={order.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{index + 1}</td>
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium whitespace-nowrap">{order.salesperson}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap max-w-[160px] truncate">{order.customerName}</td>
                    <td className="px-3 py-3 text-xs font-mono text-gray-600 whitespace-nowrap bg-gray-50/50">{order.vrno}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap tabular-nums">{order.date}</td>
                    <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap max-w-[120px] truncate">{order.itemName}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 max-w-[180px]">
                      <p className="truncate" title={order.remarks}>{order.remarks || "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-center">
                      {order.priority === 'PRIORITY' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          PRIORITY
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap text-right font-medium tabular-nums">
                      {order.rate ? `₹${order.rate}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-gray-900 whitespace-nowrap text-right tabular-nums">
                      {typeof order.balanceQty === 'number'
                        ? order.balanceQty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : order.balanceQty}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${isPending ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Package className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-medium text-gray-600">No orders found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-5 p-3 sm:p-5 lg:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Orders</h1>
          <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">Manage and track all orders</p>
        </div>
        <button
          onClick={fetchOrderData}
          disabled={loading}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-semibold shadow-sm shadow-blue-200 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'pending', label: 'Pending', count: pendingOrders.length, color: 'amber' },
          { key: 'history', label: 'History', count: historyOrders.length, color: 'emerald' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 py-2.5 px-3 sm:px-5 text-xs sm:text-sm font-bold transition-colors border-b-2 -mb-px ${activeTab === tab.key
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === tab.key
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "pending" && renderTable(pendingOrders, "pending")}
      {activeTab === "history" && renderTable(historyOrders, "history")}
    </div>
  )
}
