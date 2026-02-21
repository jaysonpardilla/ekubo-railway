import { useEffect, useState } from 'react';
import { Users, LogOut, UserPlus, FileText, Map, XCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BARANGAYS, Classification } from '../types/database';
import { users as usersApi, beneficiaries as beneficiariesApi, applications as applicationsApi, auth as authApi, deceasedReports as deceasedReportsApi } from '../lib/api';
import ChoroplethMap from '../components/ChoroplethMap';
import logo from "../assets/logo.jpg";


interface BarangayData {
  name: string;
  senior_citizen: number;
  pwd: number;
  solo_parent: number;
  total: number;
  verified: number;
  pending: number;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'applications' | 'map' | 'reports'>('overview');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifFilter, setNotifFilter] = useState<string>('all');
  const [notifPage, setNotifPage] = useState(1);
  const NOTIF_PER_PAGE = 5;
  const [mapFilter, setMapFilter] = useState<'all' | Classification>('all');
  const [selectedBarangay, setSelectedBarangay] = useState<BarangayData | null>(null);

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    address: '',
    userType: '' as 'bhw' | 'mswdo' | '',
    barangay: '',
  });
  const [userFilter, setUserFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 7;
  const [appFilter, setAppFilter] = useState<string>('all');
  const [appSearch, setAppSearch] = useState<string>('');
  const [appPage, setAppPage] = useState(1);
  const APPS_PER_PAGE = 7;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [deceasedReports, setDeceasedReports] = useState<any[]>([]);
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('');
  const [reportYearFilter, setReportYearFilter] = useState<string>('');
  const [reportPage, setReportPage] = useState(1);
  const REPORTS_PER_PAGE = 10;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Applications
      const applicationsData = await applicationsApi.getAll();
      const apps = (applicationsData || []).map((app: any) => ({
        ...app,
        programs: app.program ? { id: app.program, name: app.program_name } : app.programs || null,
        beneficiaries: {
          id: app.beneficiary,
          profiles: {
            first_name: app.first_name || '',
            last_name: app.last_name || '',
            address: app.beneficiary_address || ''
          }
        }
      }));
      setApplications(apps);

      // Users
      const usersData = await usersApi.getAll();
      setUsers(usersData || []);

      // Notifications
      try {
        const notifs = await (await import('../lib/api')).notifications.getAll();
        setNotifications(notifs || []);
      } catch (err) {
        console.error('Failed to load notifications via API', err);
      }

      // Beneficiaries
      const beneficiariesData = await beneficiariesApi.getAll();
      const bens = (beneficiariesData || []).map((b: any) => {
        // Ensure both user and profiles fields are available for compatibility
        const userData = b.user || b.profiles || null;
        return {
          ...b,
          user: userData,
          profiles: userData
        };
      });
      setBeneficiaries(bens);
      console.log('Beneficiaries loaded:', bens);

      // Deceased Reports
      try {
        const reportsData = await deceasedReportsApi.getAll();
        setDeceasedReports(reportsData || []);
      } catch (err) {
        console.error('Error loading deceased reports:', err);
        setDeceasedReports([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setApplications([]);
      setUsers([]);
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = () => {
    if (!notifications) return [];
    if (notifFilter === 'all') return notifications;
    if (notifFilter === 'unread') return notifications.filter(n => !n.is_read);
    if (notifFilter === 'read') return notifications.filter(n => n.is_read);
    // treat as type filter: info/success/warning/error
    return notifications.filter(n => n.type === notifFilter);
  };

  const pagedNotifications = () => {
    const list = filteredNotifications();
    const start = (notifPage - 1) * NOTIF_PER_PAGE;
    return list.slice(start, start + NOTIF_PER_PAGE);
  };

  const filteredUsers = () => {
    let list = users || [];
    if (userFilter !== 'all') {
      list = list.filter((u: any) => u.user_type === userFilter);
    }
    if (userSearch && userSearch.trim()) {
      const s = userSearch.toLowerCase();
      list = list.filter((u: any) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
    }
    return list;
  };

  const pagedUsers = () => {
    const list = filteredUsers();
    const start = (userPage - 1) * USERS_PER_PAGE;
    return list.slice(start, start + USERS_PER_PAGE);
  };

  const filteredApplications = () => {
    let list = applications || [];
    if (appFilter !== 'all') {
      list = list.filter((a: any) => a.status === appFilter);
    }
    if (appSearch && appSearch.trim()) {
      const s = appSearch.toLowerCase();
      list = list.filter((a: any) => {
        const name = `${a.beneficiaries?.profiles?.first_name || ''} ${a.beneficiaries?.profiles?.last_name || ''}`.toLowerCase();
        const program = (a.programs?.name || '').toLowerCase();
        return name.includes(s) || program.includes(s) || (a.id || '').toString().toLowerCase().includes(s);
      });
    }
    return list;
  };

  const pagedApplications = () => {
    const list = filteredApplications();
    const start = (appPage - 1) * APPS_PER_PAGE;
    return list.slice(start, start + APPS_PER_PAGE);
  };

  const getBarangayData = (): Record<string, BarangayData> => {
    const barangayMap: Record<string, BarangayData> = {};

    BARANGAYS.forEach(barangay => {
      barangayMap[barangay] = {
        name: barangay,
        senior_citizen: 0,
        pwd: 0,
        solo_parent: 0,
        total: 0,
        verified: 0,
        pending: 0,
      };
    });

    beneficiaries.forEach((beneficiary: any) => {
      // Extract address from user field (which is guaranteed to exist from fetchData transformation)
      const address = beneficiary.user?.address;
      if (address && barangayMap[address]) {
        const classification = beneficiary.classification;

        if (classification === 'senior_citizen') {
          barangayMap[address].senior_citizen += 1;
        } else if (classification === 'pwd') {
          barangayMap[address].pwd += 1;
        } else if (classification === 'solo_parent') {
          barangayMap[address].solo_parent += 1;
        }

        barangayMap[address].total += 1;

        if (beneficiary.status === 'approved') {
          barangayMap[address].verified += 1;
        } else {
          barangayMap[address].pending += 1;
        }
      }
    });

    return barangayMap;
  };

  const getMunicipalityStats = () => {
    let seniorCitizens = 0;
    let pwds = 0;
    let soloParents = 0;
    let verified = 0;
    let pending = 0;

    beneficiaries.forEach((beneficiary: any) => {
      if (beneficiary.classification === 'senior_citizen') seniorCitizens++;
      if (beneficiary.classification === 'pwd') pwds++;
      if (beneficiary.classification === 'solo_parent') soloParents++;
      if (beneficiary.status === 'approved') verified++;
      if (beneficiary.status === 'pending') pending++;
    });

    return {
      seniorCitizens,
      pwds,
      soloParents,
      total: beneficiaries.length,
      verified,
      pending,
    };
  };

  const getBeneficiaryMarkers = () => {
    return beneficiaries
      .filter((beneficiary: any) =>
        beneficiary.latitude != null &&
        beneficiary.longitude != null &&
        (beneficiary.user?.address || beneficiary.profiles?.address)
      )
      .map((beneficiary: any) => ({
        id: beneficiary.id,
        latitude: parseFloat(beneficiary.latitude),
        longitude: parseFloat(beneficiary.longitude),
        classification: beneficiary.classification,
        name: `${(beneficiary.user?.first_name || beneficiary.profiles?.first_name || '')} ${(beneficiary.user?.last_name || beneficiary.profiles?.last_name || '')}`,
        address: beneficiary.user?.address || beneficiary.profiles?.address,
        status: beneficiary.status,
        disability_type: beneficiary.disability_type,
      }));
  };

  // Chart data for last 5 months (clustered by status)
  const getLastFiveMonthsChart = () => {
    const statuses = ['pending', 'bhw_verified', 'mswdo_approved', 'scheduled', 'claimed'];
    const colors: Record<string,string> = {
      pending: '#f59e0b',
      bhw_verified: '#3b82f6',
      mswdo_approved: '#10b981',
      scheduled: '#6366f1',
      claimed: '#6b7280'
    };

    const labels: string[] = [];
    const months: {month:number, year:number}[] = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
      months.push({ month: d.getMonth(), year: d.getFullYear() });
    }

    const datasets = statuses.map(status => ({
      status,
      color: colors[status],
      data: months.map(m => {
        return applications.filter(a => {
          try {
            const dt = new Date(a.created_at);
            return dt.getMonth() === m.month && dt.getFullYear() === m.year && a.status === status;
          } catch (e) { return false; }
        }).length;
      })
    }));

    return { labels, datasets };
  };

  const [editUser, setEditUser] = useState<any | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);

  const handleEditClick = (u: any) => {
    setEditUser({ ...u });
    setShowEditUser(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      await usersApi.update(editUser.id, {
        first_name: editUser.first_name,
        last_name: editUser.last_name,
        email: editUser.email,
        user_type: editUser.user_type,
        address: editUser.address,
      });
      setShowEditUser(false);
      setEditUser(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await usersApi.delete(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Failed to delete user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = {
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        address: newUser.address,
        userType: newUser.userType,
      };
      if (newUser.userType === 'bhw' && newUser.barangay) {
        payload.barangay = newUser.barangay;
      }

      const created = await usersApi.create(payload);
      if (created) {
        setShowCreateUser(false);
        setNewUser({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          password: '',
          address: '',
          userType: '',
          barangay: '',
        });
        await fetchData();
        alert('User created successfully');
      }
    } catch (err: any) {
      console.error('Create user error:', err);
      alert(err?.message || String(err) || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">CBSGMS</h1>
                <p className="text-xs text-gray-500">System Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <button onClick={() => setActiveTab('notifications')} className={`px-3 py-1 rounded-md ${activeTab==='notifications'?'bg-blue-50 text-blue-700':'text-gray-600 hover:bg-gray-50'}`}>
                  Notifications ({notifications.filter(n => !n.is_read).length})
                </button>
              </div>

              <div className="relative">
                <button onClick={() => setShowUserMenu(s => !s)} className="flex items-center text-gray-700 hover:text-gray-900 p-2 rounded-full">
                  <User className="w-6 h-6" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                    <button onClick={() => { setShowUserMenu(false); signOut(); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">Sign Out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm flex">
          {/* Sidebar */}
          <aside className="w-64 border-r px-4 py-6 bg-gray-200">
            <div className="space-y-4">
              <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='overview'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> Overview
              </button>
              <button onClick={() => setActiveTab('map')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='map'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <Map className="w-4 h-4 inline mr-2" /> Barangay Map
              </button>
              <button onClick={() => setActiveTab('users')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='users'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <Users className="w-4 h-4 inline mr-2" /> Users ({users.length})
              </button>
              <button onClick={() => setActiveTab('applications')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='applications'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> Applications ({applications.length})
              </button>
              <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='reports'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> Reports ({deceasedReports.length})
              </button>
            </div>
          </aside>

          <div className="flex-1 p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <Users className="w-8 h-8 text-blue-600" aria-hidden />
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-800">{users.length}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <User className="w-8 h-8 text-green-600" aria-hidden />
                    <p className="text-sm text-gray-600">Beneficiaries</p>
                    <p className="text-2xl font-bold text-green-800">
                      {users.filter(u => u.user_type === 'beneficiary').length}
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <UserPlus className="w-8 h-8 text-yellow-600" aria-hidden />
                    <p className="text-sm text-gray-600">BHWs</p>
                    <p className="text-2xl font-bold text-yellow-800">
                      {users.filter(u => u.user_type === 'bhw').length}
                    </p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <FileText className="w-8 h-8 text-indigo-600" aria-hidden />
                    <p className="text-sm text-gray-600">MSWDO Staff</p>
                    <p className="text-2xl font-bold text-indigo-800">
                      {users.filter(u => u.user_type === 'mswdo').length}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-xl font-bold text-gray-800">
                        {applications.filter(app => app.status === 'pending').length}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Verified</p>
                      <p className="text-xl font-bold text-blue-800">
                        {applications.filter(app => app.status === 'bhw_verified').length}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-xl font-bold text-green-800">
                        {applications.filter(app => app.status === 'mswdo_approved').length}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Scheduled</p>
                      <p className="text-xl font-bold text-indigo-800">
                        {applications.filter(app => app.status === 'scheduled').length}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Claimed</p>
                      <p className="text-xl font-bold text-purple-800">
                        {applications.filter(app => app.status === 'claimed').length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simple clustered bar chart for last 5 months */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Applications (last 5 months)</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {(() => {
                      const chart = getLastFiveMonthsChart();
                      const labels = chart.labels;
                      const datasets = chart.datasets;
                      const maxVal = Math.max(1, ...datasets.flatMap(d => d.data));
                      const width = 700;
                      const height = 220;
                      const padding = { top: 10, right: 10, bottom: 30, left: 30 };
                      const innerW = width - padding.left - padding.right;
                      const innerH = height - padding.top - padding.bottom;
                      const groupW = innerW / labels.length;
                      const barGap = 6;
                      const barW = (groupW - barGap * (datasets.length - 1)) / datasets.length;

                      return (
                        <div className="overflow-auto">
                          <svg width={width} height={height}>
                            <g transform={`translate(${padding.left},${padding.top})`}>
                              {labels.map((label, i) => (
                                <g key={label} transform={`translate(${i * groupW},0)`}> 
                                  {datasets.map((ds: any, j: number) => {
                                    const val = ds.data[i] || 0;
                                    const h = (val / maxVal) * innerH;
                                    const x = j * (barW + barGap);
                                    const y = innerH - h;
                                    return (
                                      <rect key={ds.status} x={x} y={y} width={barW} height={h} fill={ds.color} />
                                    );
                                  })}
                                  <text x={groupW / 2} y={innerH + 16} fontSize={11} textAnchor="middle" fill="#374151">{label}</text>
                                </g>
                              ))}
                            </g>
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Filter:</label>
                    <select value={notifFilter} onChange={(e) => { setNotifFilter(e.target.value); setNotifPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {pagedNotifications().map((n: any) => (
                    <div key={n.id} className={`border rounded-lg p-4 ${n.is_read ? 'bg-white' : 'bg-yellow-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{n.title}</p>
                          <p className="text-sm text-gray-600">{n.message}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{new Date(n.created_at).toLocaleString()}</p>
                          <p className="mt-1">{n.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button onClick={() => setNotifPage(p => Math.max(1, p-1))} className="px-3 py-1 bg-gray-100 rounded">Prev</button>
                  <span className="text-sm text-gray-700">Page {notifPage} / {Math.max(1, Math.ceil(filteredNotifications().length / NOTIF_PER_PAGE))}</span>
                  <button onClick={() => setNotifPage(p => Math.min(Math.max(1, Math.ceil(filteredNotifications().length / NOTIF_PER_PAGE)), p+1))} className="px-3 py-1 bg-gray-100 rounded">Next</button>
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Naval Barangay Beneficiary Distribution</h3>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Filter:</label>
                    <select
                      value={mapFilter}
                      onChange={(e) => setMapFilter(e.target.value as 'all' | Classification)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Beneficiaries</option>
                      <option value="senior_citizen">Senior Citizens</option>
                      <option value="pwd">PWD</option>
                      <option value="solo_parent">Solo Parents</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <ChoroplethMap
                      barangayData={getBarangayData()}
                      beneficiaries={getBeneficiaryMarkers()}
                      filter={mapFilter}
                      onBarangayClick={(data) => setSelectedBarangay(data)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Municipality Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Beneficiaries</span>
                          <span className="text-lg font-bold text-blue-600">{getMunicipalityStats().total}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Senior Citizens</span>
                            <span className="text-md font-semibold text-gray-900">{getMunicipalityStats().seniorCitizens}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">PWD</span>
                            <span className="text-md font-semibold text-gray-900">{getMunicipalityStats().pwds}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Solo Parents</span>
                            <span className="text-md font-semibold text-gray-900">{getMunicipalityStats().soloParents}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-green-600">Verified</span>
                            <span className="text-md font-semibold text-green-700">{getMunicipalityStats().verified}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-yellow-600">Pending</span>
                            <span className="text-md font-semibold text-yellow-700">{getMunicipalityStats().pending}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Barangays with Beneficiaries</h4>
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-auto">
                        {Object.values(getBarangayData())
                          .filter(b => b.total > 0)
                          .map(b => (
                            <button
                              key={b.name}
                              onClick={() => setSelectedBarangay(b)}
                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{b.name}</p>
                                <p className="text-xs text-gray-500">{b.total} beneficiaries</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-800">{b.total}</p>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">How to Use</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Hover over barangays to see counts</li>
                        <li>• Click barangays for details</li>
                        <li>• Click markers for beneficiary info</li>
                        <li>• Use filters to view specific groups</li>
                        <li>• Darker colors = more beneficiaries</li>
                      </ul>
                    </div> */}

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">Beneficiaries with Location</h4>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-900">{getBeneficiaryMarkers().length}</p>
                        <p className="text-xs text-green-700">out of {beneficiaries.length} total</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">System Users</h3>
                  <div className="flex items-center space-x-3">
                    <input type="text" placeholder="Search name or email" value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg" />
                    <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setUserPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="all">All Types</option>
                      <option value="beneficiary">Beneficiary</option>
                      <option value="bhw">BHW</option>
                      <option value="mswdo">MSWDO</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => setShowCreateUser(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create User
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barangay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pagedUsers().map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {user.user_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.address}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button onClick={() => handleEditClick(user)} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">Edit</button>
                              <button onClick={() => handleDeleteUser(user.id)} className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Users pagination */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button onClick={() => setUserPage(p => Math.max(1, p-1))} className="px-3 py-1 bg-gray-100 rounded">Prev</button>
                  <span className="text-sm text-gray-700">Page {userPage} / {Math.max(1, Math.ceil(filteredUsers().length / USERS_PER_PAGE))}</span>
                  <button onClick={() => setUserPage(p => Math.min(Math.max(1, Math.ceil(filteredUsers().length / USERS_PER_PAGE)), p+1))} className="px-3 py-1 bg-gray-100 rounded">Next</button>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Deceased Reports</h3>
                </div>

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 mr-2">Month:</label>
                    <select value={reportMonthFilter} onChange={(e) => { setReportMonthFilter(e.target.value); setReportPage(1); }} className="border rounded px-2 py-1">
                      <option value="">All months</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>

                    <label className="text-sm text-gray-600 ml-4 mr-2">Year:</label>
                    <select value={reportYearFilter} onChange={(e) => { setReportYearFilter(e.target.value); setReportPage(1); }} className="border rounded px-2 py-1">
                      <option value="">All years</option>
                      {Array.from(new Set((deceasedReports || []).map((r: any) => {
                        const dt = r?.date_time_of_death ? new Date(r.date_time_of_death) : (r?.created_at ? new Date(r.created_at) : null);
                        return dt ? dt.getFullYear() : null;
                      }).filter(Boolean))).sort((a: any, b: any) => b - a).map((y: any) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm text-gray-600">Total reports: {deceasedReports.length}</div>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const filtered = (deceasedReports || []).slice().sort((a, b) => (new Date(b.created_at || b.date_time_of_death || 0).getTime()) - (new Date(a.created_at || a.date_time_of_death || 0).getTime()));
                    const filteredByDate = filtered.filter((r: any) => {
                      if (!reportMonthFilter && !reportYearFilter) return true;
                      const dt = r?.date_time_of_death ? new Date(r.date_time_of_death) : (r?.created_at ? new Date(r.created_at) : null);
                      if (!dt) return false;
                      if (reportMonthFilter && String(dt.getMonth() + 1) !== reportMonthFilter) return false;
                      if (reportYearFilter && String(dt.getFullYear()) !== reportYearFilter) return false;
                      return true;
                    });

                    const totalPages = Math.max(1, Math.ceil(filteredByDate.length / REPORTS_PER_PAGE));
                    const currentPage = Math.min(Math.max(1, reportPage), totalPages);
                    const start = (currentPage - 1) * REPORTS_PER_PAGE;
                    const paginated = filteredByDate.slice(start, start + REPORTS_PER_PAGE);

                    if (filtered.length === 0) return <p className="text-gray-500 text-center py-8">No reports found</p>;

                    return (
                      <>
                        {paginated.map((r: any) => (
                          <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{r.full_name}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Reported:</span> {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Death Date:</span> {r.date_time_of_death ? new Date(r.date_time_of_death).toLocaleDateString() : 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Barangay:</span> {r.beneficiary_barangay || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Source:</span> {r.source_of_information || 'N/A'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                {r.confirmed ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Confirmed</span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                          <p className="text-sm text-gray-600">Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span> ({filteredByDate.length} matching)</p>
                          <div className="flex gap-2">
                            <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                            <button onClick={() => setReportPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Applications</h3>
                  <div className="flex items-center space-x-3">
                    <input type="text" placeholder="Search name, program or id" value={appSearch} onChange={(e) => { setAppSearch(e.target.value); setAppPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg" />
                    <select value={appFilter} onChange={(e) => { setAppFilter(e.target.value); setAppPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="bhw_verified">BHW Verified</option>
                      <option value="mswdo_approved">MSWDO Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="claimed">Claimed</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {pagedApplications().map((app: any) => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {app.beneficiaries?.profiles?.first_name} {app.beneficiaries?.profiles?.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{app.programs?.name}</p>
                          <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'bhw_verified' ? 'bg-blue-100 text-blue-800' :
                          app.status === 'mswdo_approved' ? 'bg-green-100 text-green-800' :
                          app.status === 'scheduled' ? 'bg-indigo-100 text-indigo-800' :
                          app.status === 'claimed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Applications pagination */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <button onClick={() => setAppPage(p => Math.max(1, p-1))} className="px-3 py-1 bg-gray-100 rounded">Prev</button>
                  <span className="text-sm text-gray-700">Page {appPage} / {Math.max(1, Math.ceil(filteredApplications().length / APPS_PER_PAGE))}</span>
                  <button onClick={() => setAppPage(p => Math.min(Math.max(1, Math.ceil(filteredApplications().length / APPS_PER_PAGE)), p+1))} className="px-3 py-1 bg-gray-100 rounded">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBarangay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedBarangay.name}</h2>
              <button
                onClick={() => setSelectedBarangay(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Total Beneficiaries</p>
                  <p className="text-3xl font-bold text-blue-900">{selectedBarangay.total}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Municipal Share</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {getMunicipalityStats().total > 0
                      ? ((selectedBarangay.total / getMunicipalityStats().total) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Beneficiary Classification</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Senior Citizens</p>
                    <p className="text-2xl font-bold text-green-900">{selectedBarangay.senior_citizen}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">PWD</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedBarangay.pwd}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Solo Parents</p>
                    <p className="text-2xl font-bold text-purple-900">{selectedBarangay.solo_parent}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Verification Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">Verified</span>
                    <span className="text-xl font-bold text-green-900">{selectedBarangay.verified}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-yellow-700">Pending</span>
                    <span className="text-xl font-bold text-yellow-900">{selectedBarangay.pending}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={() => setSelectedBarangay(null)}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New User</h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <select
                  value={newUser.userType}
                  onChange={(e) => setNewUser({ ...newUser, userType: e.target.value as 'bhw' | 'mswdo' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="bhw">BHW</option>
                  <option value="mswdo">MSWDO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address/Barangay</label>
                <select
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Barangay</option>
                  {BARANGAYS.map((barangay) => (
                    <option key={barangay} value={barangay}>
                      {barangay}
                    </option>
                  ))}
                </select>
              </div>

              {newUser.userType === 'bhw' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Barangay</label>
                  <select
                    value={newUser.barangay}
                    onChange={(e) => setNewUser({ ...newUser, barangay: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select Barangay</option>
                    {BARANGAYS.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({
                      firstName: '',
                      lastName: '',
                      username: '',
                      email: '',
                      password: '',
                      address: '',
                      userType: '',
                      barangay: '',
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditUser && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editUser.first_name || ''}
                  onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editUser.last_name || ''}
                  onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editUser.email || ''}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address/Barangay</label>
                <select
                  value={editUser.address || ''}
                  onChange={(e) => setEditUser({ ...editUser, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Barangay</option>
                  {BARANGAYS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowEditUser(false); setEditUser(null); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
