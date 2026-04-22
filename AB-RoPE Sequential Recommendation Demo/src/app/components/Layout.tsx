import { Outlet, NavLink } from 'react-router';
import { useState } from 'react';
import { Home, ScanSearch, FlaskConical, ChevronDown, Database, Menu, X } from 'lucide-react';

const DATASETS = [
  'Taobao 10M Subset',
  'Amazon Electronics 5M',
  'JD.com Fashion 2M',
  'Alibaba Retail 8M',
];

export function Layout() {
  const [dataset, setDataset] = useState(DATASETS[0]);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Simulator', icon: Home, end: true },
    { to: '/xray', label: 'X-Ray Vision', icon: ScanSearch, end: false },
    { to: '/modellab', label: 'Model Lab', icon: FlaskConical, end: false },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-slate-900 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">AB</span>
            </div>
            <div>
              <p className="text-white text-sm">AB-RoPE</p>
              <p className="text-slate-400 text-xs">Adaptive Behavior ROPE</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-slate-500 text-xs px-3 pb-2 uppercase tracking-wider">Navigation</p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
                ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom info */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-700">
          <p className="text-slate-600 text-xs mt-0.5">AB-RoPE v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-slate-900 text-sm hidden sm:block">
                Adaptive Behavior-Aware RoPE · Sequential Recommendation
              </h1>
              <h1 className="text-slate-900 text-sm sm:hidden">AB-RoPE System</h1>
            </div>
          </div>

          {/* Dataset selector */}
          <div className="relative">
            <button
              onClick={() => setDatasetOpen(!datasetOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm text-slate-700"
            >
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline text-xs">{dataset}</span>
              <span className="sm:hidden text-xs">Dataset</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${datasetOpen ? 'rotate-180' : ''}`} />
            </button>
            {datasetOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {DATASETS.map((ds) => (
                  <button
                    key={ds}
                    onClick={() => { setDataset(ds); setDatasetOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors
                      ${ds === dataset ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {ds}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
