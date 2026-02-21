import { useEffect, useState } from 'react';
import { FileText, LogOut, CheckCircle, XCircle, Eye, User, Bell, Folder, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Application, Notification, Program } from '../types/database';
import { programs as programsApi, applications as applicationsApi, notifications as notificationsApi, beneficiaries as beneficiariesApi, deceasedReports as deceasedReportsApi } from '../lib/api';
import logo from '../assets/logo.jpg';

export default function BHWDashboard() {
  const { user, signOut } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [notifications, setNotifications]= useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'applications' | 'programs' | 'notifications' | 'reports' | 'beneficiaries'>('applications');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('');
  const [appPage, setAppPage] = useState(1);
  const [programSearch, setProgramSearch] = useState('');
  const [programClassFilter, setProgramClassFilter] = useState<string>('');
  const [programPage, setProgramPage] = useState(1);
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('');
  const [notificationPage, setNotificationPage] = useState(1);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [deceasedReports, setDeceasedReports] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportPage, setReportPage] = useState(1);
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('');
  const [reportYearFilter, setReportYearFilter] = useState<string>('');
  const [beneficiarySearch, setBeneficiarySearch] = useState<string>('');
  const [beneficiaryClassFilter, setBeneficiaryClassFilter] = useState<string>('');
  const [beneficiaryPage, setBeneficiaryPage] = useState(1);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any | null>(null);

  // report form state
  const [reportForm, setReportForm] = useState<any>({
    full_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    email: '',
    phone_number: '',
    address: '',
    beneficiary_name: '',
    beneficiary_barangay: '',
    date_time_of_death: '',
    cause_of_death: '',
    source_of_information: ''
  });

  // Safe accessors for varied application shapes
  const getBeneficiaryFirstName = (app: any) => {
    return app?.beneficiaries?.profiles?.first_name || app?.beneficiary?.user?.first_name || app?.form_data?.applicantInfo?.first_name || '';
  };
  const getBeneficiaryLastName = (app: any) => {
    return app?.beneficiaries?.profiles?.last_name || app?.beneficiary?.user?.last_name || app?.form_data?.applicantInfo?.last_name || '';
  };
  const getBeneficiaryEmail = (app: any) => {
    return app?.beneficiaries?.profiles?.email || app?.beneficiary?.user?.email || app?.form_data?.applicantInfo?.email || '';
  };
  const getBeneficiaryAddress = (app: any) => {
    return app?.beneficiaries?.profiles?.address || app?.beneficiary?.user?.address || app?.form_data?.applicantInfo?.address || '';
  };
  const getProgramName = (app: any) => {
    return app?.programs?.name || app?.program?.name || app?.program_name || '';
  };

  const matchesBarangay = (assignBarangay: string | undefined | null, address: string | undefined | null) => {
    if (!assignBarangay || !address) return false;
    const a = String(assignBarangay).trim().toLowerCase();
    const b = String(address).trim().toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch applications via backend API (backend filters by BHW assignments)
      const applicationsData = await applicationsApi.getAll();
      
      // Normalize backend application shape to include application_documents
      const normalized = (applicationsData || []).map((a: any) => ({
        ...a,
        programs: { id: a.program || a.program?.id, name: a.program_name || a.program?.name, description: a.program?.description },
        beneficiaries: { profiles: { first_name: a.first_name || a.beneficiary?.user?.first_name || '', middle_name: '', last_name: a.last_name || a.beneficiary?.user?.last_name || '', address: a.beneficiary_address || a.beneficiary?.user?.address || '', user_id: a.beneficiary_user_id || (a.beneficiary && a.beneficiary.user) || null }, classification: a.classification || a.beneficiary?.classification },
        application_documents: a.documents || a.application_documents || [],
        release_schedules: a.release_schedules || [],
        created_at: a.created_at,
        status: a.status,
        form_data: a.form_data || {}
      }));
      
      setApplications(normalized);

      // derive assigned barangays from returned applications (use tolerant getters)
      const assignedBarangays = Array.from(new Set((normalized || []).map((a: any) => getBeneficiaryAddress(a)).filter(Boolean)));
      setBarangays(assignedBarangays || []);

      try {
        const programsData = await programsApi.getAll();
        const activePrograms = (programsData || []).filter((p: any) => p.is_active !== false);
        setPrograms(activePrograms);
      } catch (err) {
        console.error('Error loading programs from API:', err);
        setPrograms([]);
      }

      try {
        const notificationsData = await notificationsApi.getAll();
        setNotifications(notificationsData || []);
        setUnreadCount(notificationsData?.filter((n: any) => !n.is_read).length || 0);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setNotifications([]);
        setUnreadCount(0);
      }
      try {
        const beneficiariesData = await beneficiariesApi.getAll();
        setBeneficiaries(beneficiariesData || []);
      } catch (err) {
        console.error('Error loading beneficiaries:', err);
        setBeneficiaries([]);
      }

      try {
        const reportsData = await deceasedReportsApi.getAll();
        setDeceasedReports(reportsData || []);
      } catch (err) {
        console.error('Error loading deceased reports:', err);
        setDeceasedReports([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);

      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(unreadNotifications.map(n => notificationsApi.markAsRead(n.id)));

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleVerify = async (applicationId: string, approved: boolean) => {
    if (!user) return;

    setVerifying(true);
    try {
      if (approved && !verifyNotes.trim() && !(selectedApp?.application_documents && selectedApp.application_documents.length > 0)) {
        const ok = confirm('You are approving without notes or uploaded documents. Are you sure you want to proceed?');
        if (!ok) {
          setVerifying(false);
          return;
        }
      }

      const payload: any = { status: approved ? 'bhw_verified' : 'denied' };
      if (verifyNotes) {
        payload.bhwNotes = verifyNotes;
        if (!approved) payload.denialReason = verifyNotes || 'Application denied by BHW';
      }

      await applicationsApi.update(applicationId, payload);

      setSelectedApp(null);
      setVerifyNotes('');
      fetchData();
    } catch (err: any) {
      console.error('Verification error:', err);
      alert('Failed to verify application');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      bhw_verified: { color: 'bg-blue-100 text-blue-800', text: 'BHW Verified' },
      mswdo_approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      scheduled: { color: 'bg-indigo-100 text-indigo-800', text: 'Scheduled' },
      claimed: { color: 'bg-gray-100 text-gray-800', text: 'Claimed' },
      denied: { color: 'bg-red-100 text-red-800', text: 'Denied' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
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
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">CBSGMS</h1>
                <p className="text-xs text-gray-500">BHW Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user?.user_metadata?.full_name || user?.email || 'User'}</p>
              </div>
              <div className="relative">
                <button onClick={() => setShowUserMenu(s => !s)} className="flex items-center text-gray-700 hover:text-gray-900 p-2 rounded-full">
                  <User className="w-6 h-6" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                    <div className="px-4 py-2 text-sm text-gray-700">{user?.user_metadata?.full_name || user?.email || 'User'}</div>
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
          <aside className="w-64 border-r px-4 py-6 bg-gray-100">
            <div className="space-y-4">
              <button onClick={() => setActiveTab('applications')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='applications'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> Applications
              </button>
              <button onClick={() => setActiveTab('programs')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='programs'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <Folder className="w-4 h-4 inline mr-2" /> Programs ({programs.length})
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='notifications'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <Bell className="w-4 h-4 inline mr-2" /> Notifications {unreadCount>0 && (<span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>)}
              </button>
              <button onClick={() => setActiveTab('reports')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='reports'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> Reports
              </button>
              <button onClick={() => setActiveTab('beneficiaries')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='beneficiaries'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <User className="w-4 h-4 inline mr-2" /> Beneficiaries
              </button>
            </div>
          </aside>

          <div className="flex-1 p-6">

        {activeTab === 'applications' && (
          <div>
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by beneficiary or program name..."
                    value={appSearch}
                    onChange={(e) => { setAppSearch(e.target.value); setAppPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={appStatusFilter}
                    onChange={(e) => { setAppStatusFilter(e.target.value); setAppPage(1); }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="bhw_verified">BHW Verified</option>
                    <option value="mswdo_approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="claimed">Claimed</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {(() => {
                // Filter applications by search and status
                let filtered = applications.filter((application: any) => {
                  const beneficiaryName = (getBeneficiaryFirstName(application) + ' ' + getBeneficiaryLastName(application)).toLowerCase();
                  const programName = getProgramName(application).toLowerCase();
                  const matchesSearch = beneficiaryName.includes(appSearch.toLowerCase()) || programName.includes(appSearch.toLowerCase());
                  const matchesStatus = !appStatusFilter || application.status === appStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                // Sort by creation date (newest first)
                filtered.sort((a, b) => {
                  const dateA = new Date(a.created_at || 0).getTime();
                  const dateB = new Date(b.created_at || 0).getTime();
                  return dateB - dateA;
                });

                // Pagination
                const itemsPerPage = 3;
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const start = (appPage - 1) * itemsPerPage;
                const paginatedApps = filtered.slice(start, start + itemsPerPage);

                return (
                  <>
                    {filtered.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 text-lg">No applications found</p>
                    ) : (
                      <>
                        {paginatedApps.map((application) => (
                          <div key={application.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <User className="w-5 h-5 text-gray-400 mr-2" />
                                  <h3 className="font-semibold text-gray-900">
                                    {getBeneficiaryFirstName(application)} {getBeneficiaryLastName(application)}
                                  </h3>
                                </div>
                                <p className="text-gray-600">{getProgramName(application)}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  Applied on {new Date(application.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-500">Barangay: {getBeneficiaryAddress(application)}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(application.status)}
                                <button
                                  onClick={() => setSelectedApp(application)}
                                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </button>
                              </div>
                            </div>

                            {application.form_data && (
                              <div className="bg-gray-50 rounded p-3 mb-3">
                                <p className="text-sm font-medium text-gray-700">Reason:</p>
                                <p className="text-sm text-gray-600">{application.form_data.reason}</p>
                              </div>
                            )}

                            {application.status === 'pending' && (
                              <div className="flex space-x-2 mt-4">
                                <button
                                  onClick={() => setSelectedApp(application)}
                                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify
                                </button>
                                <button
                                  onClick={() => { setSelectedApp(application); }}
                                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Deny
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page <span className="font-semibold">{appPage}</span> of <span className="font-semibold">{totalPages}</span> ({filtered.length} applications)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setAppPage(p => Math.max(1, p - 1))}
                                disabled={appPage === 1}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" /> Previous
                              </button>
                              <button
                                onClick={() => setAppPage(p => Math.min(totalPages, p + 1))}
                                disabled={appPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div>
            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search programs by name..."
                    value={programSearch}
                    onChange={(e) => { setProgramSearch(e.target.value); setProgramPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                {/* Classification Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={programClassFilter}
                    onChange={(e) => { setProgramClassFilter(e.target.value); setProgramPage(1); }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Classifications</option>
                    <option value="senior_citizen">Senior Citizen</option>
                    <option value="pwd">PWD</option>
                    <option value="solo_parent">Solo Parent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Programs List */}
            <div className="space-y-4">
              {(() => {
                // Filter programs by search and classification
                let filtered = programs.filter((program) => {
                  const matchesSearch = program.name.toLowerCase().includes(programSearch.toLowerCase()) ||
                    (program.description && program.description.toLowerCase().includes(programSearch.toLowerCase()));
                  const matchesClassification = !programClassFilter || 
                    (program.classification && program.classification.includes(programClassFilter));
                  return matchesSearch && matchesClassification;
                });

                // Sort by creation date (newest first)
                filtered.sort((a, b) => {
                  const dateA = new Date(a.created_at || 0).getTime();
                  const dateB = new Date(b.created_at || 0).getTime();
                  return dateB - dateA;
                });

                // Pagination
                const itemsPerPage = 3;
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const start = (programPage - 1) * itemsPerPage;
                const paginatedPrograms = filtered.slice(start, start + itemsPerPage);

                return (
                  <>
                    {filtered.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 text-lg">No programs found</p>
                    ) : (
                      <>
                        {paginatedPrograms.map((program) => (
                          <div key={program.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <h3 className="font-semibold text-gray-900 text-lg">{program.name}</h3>
                                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                </div>
                                <p className="text-gray-600 mb-2">{program.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                                  <div>
                                    <span className="font-medium">Classification:</span>{' '}
                                    <span className="capitalize">{(program.classification && program.classification.length > 0) ? program.classification.join(', ').replace(/_/g, ' ') : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Type:</span>{' '}
                                    <span className="capitalize">{program.program_type ? program.program_type.replace(/_/g, ' ') : 'N/A'}</span>
                                  </div>
                                </div>
                                {program.eligibility_criteria && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">Eligibility:</span> {program.eligibility_criteria}
                                  </div>
                                )}
                                {(program.application_start_date || program.application_end_date) && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">Application Period:</span>{' '}
                                    {program.application_start_date && new Date(program.application_start_date).toLocaleDateString()}
                                    {program.application_start_date && program.application_end_date && ' - '}
                                    {program.application_end_date && new Date(program.application_end_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedProgram(program);
                                  setShowProgramModal(true);
                                }}
                                className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </button>
                            </div>
                            {program.requirements && program.requirements.length > 0 && (
                              <div className="mt-4 bg-gray-50 rounded p-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {program.requirements.map((req: string, idx: number) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page <span className="font-semibold">{programPage}</span> of <span className="font-semibold">{totalPages}</span> ({filtered.length} programs)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setProgramPage(p => Math.max(1, p - 1))}
                                disabled={programPage === 1}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" /> Previous
                              </button>
                              <button
                                onClick={() => setProgramPage(p => Math.min(totalPages, p + 1))}
                                disabled={programPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
              <p className="text-sm text-gray-600">Beneficiaries in your assigned barangay</p>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 mr-2">Filter by month:</label>
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

              <div className="text-sm text-gray-600">Showing {deceasedReports.length} total reports</div>
            </div>

            <div className="space-y-4">
              {(() => {
                const bhwAddr = user?.address || '';
                const matched = (deceasedReports || []).filter((r: any) => {
                  const addr = r?.beneficiary_barangay || r?.address || '';
                  return matchesBarangay(bhwAddr, addr);
                });

                if (!matched || matched.length === 0) {
                  return <p className="text-gray-500 text-center py-12">No reports found for your barangay</p>;
                }

                // apply month/year filters
                const filtered = matched.filter((r: any) => {
                  if (!reportMonthFilter && !reportYearFilter) return true;
                  const dt = r?.date_time_of_death ? new Date(r.date_time_of_death) : (r?.created_at ? new Date(r.created_at) : null);
                  if (!dt) return false;
                  if (reportMonthFilter && String(dt.getMonth() + 1) !== reportMonthFilter) return false;
                  if (reportYearFilter && String(dt.getFullYear()) !== reportYearFilter) return false;
                  return true;
                });

                const itemsPerPage = 4;
                const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
                const currentPage = Math.min(Math.max(1, reportPage), totalPages);
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filtered.slice(start, start + itemsPerPage);

                return (
                  <>
                    {paginated.map((r: any) => (
                      <div key={r.id} className="border border-gray-200 rounded-lg p-4 cursor-pointer" onClick={() => setSelectedReport(r)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{r.full_name}</h3>
                            <p className="text-sm text-gray-500">Deceased: {r.full_name} • DOB: {r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                            <p className="text-sm text-gray-500">Date/Time of Death: {r.date_time_of_death ? new Date(r.date_time_of_death).toLocaleString() : 'N/A'}</p>
                            <p className="text-sm text-gray-500">Beneficiary: {r.beneficiary_name || 'N/A'} • Barangay: {r.beneficiary_barangay || (r.address || 'N/A')}</p>
                            <p className="text-sm text-gray-500">Source: {r.source_of_information || 'N/A'}</p>
                            {r.cause_of_death && <p className="mt-2 text-sm text-gray-700">Cause: {r.cause_of_death}</p>}
                          </div>
                          <div className="text-right text-xs text-gray-500">Reported: {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}</div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span> ({filtered.length} matching)</p>
                      <div className="flex gap-2">
                        <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                        <button onClick={() => setReportPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Floating create button (also opens modal) */}
            <button
              onClick={() => setShowReportModal(true)}
              className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-700"
            >
              Create Report
            </button>

            {showReportModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Create Deceased Report</h2>
                      <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-gray-700"><XCircle className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" value={reportForm.full_name} onChange={(e) => setReportForm((f:any)=>({...f, full_name: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                          <input type="date" value={reportForm.date_of_birth} onChange={(e)=>setReportForm((f:any)=>({...f, date_of_birth: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Gender</label>
                          <select value={reportForm.gender} onChange={(e)=>setReportForm((f:any)=>({...f, gender: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nationality</label>
                        <input type="text" value={reportForm.nationality} onChange={(e)=>setReportForm((f:any)=>({...f, nationality: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email Address</label>
                          <input type="email" value={reportForm.email} onChange={(e)=>setReportForm((f:any)=>({...f, email: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input type="text" value={reportForm.phone_number} onChange={(e)=>setReportForm((f:any)=>({...f, phone_number: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address / Barangay</label>
                        <input type="text" value={reportForm.beneficiary_barangay} onChange={(e)=>setReportForm((f:any)=>({...f, beneficiary_barangay: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date & Time of Death</label>
                          <input type="datetime-local" value={reportForm.date_time_of_death} onChange={(e)=>setReportForm((f:any)=>({...f, date_time_of_death: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Source of Information</label>
                          <select value={reportForm.source_of_information} onChange={(e)=>setReportForm((f:any)=>({...f, source_of_information: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                            <option value="">Select</option>
                            <option value="family">Family</option>
                            <option value="hospital">Hospital</option>
                            <option value="barangay">Barangay</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cause of Death</label>
                        <textarea value={reportForm.cause_of_death} onChange={(e)=>setReportForm((f:any)=>({...f, cause_of_death: e.target.value}))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" rows={3}></textarea>
                      </div>

                      <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button onClick={async () => {
                          try {
                            if (!reportForm.full_name) return alert('Full name is required');
                            // ensure beneficiary_barangay defaults to BHW address if empty
                            const payload = { ...reportForm, beneficiary_barangay: reportForm.beneficiary_barangay || user?.address || '' };
                            await deceasedReportsApi.create(payload);
                            alert('Report created');
                            setShowReportModal(false);
                            // refresh reports
                            const reportsData = await deceasedReportsApi.getAll();
                            setDeceasedReports(reportsData || []);
                            setReportForm({ full_name: '', date_of_birth: '', gender: '', nationality: '', email: '', phone_number: '', address: '', beneficiary_name: '', beneficiary_barangay: '', date_time_of_death: '', cause_of_death: '', source_of_information: '' });
                          } catch (err: any) {
                            console.error('Failed to create report', err);
                            alert('Failed to create report');
                          }
                        }} className="px-4 py-2 bg-blue-600 text-white rounded">Save Report</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        )}

        {activeTab === 'beneficiaries' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficiaries in {user?.address || 'Your Barangay'}</h3>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={beneficiarySearch}
                    onChange={(e) => { setBeneficiarySearch(e.target.value); setBeneficiaryPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                {/* Classification Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={beneficiaryClassFilter}
                    onChange={(e) => { setBeneficiaryClassFilter(e.target.value); setBeneficiaryPage(1); }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Classifications</option>
                    <option value="senior_citizen">Senior Citizen</option>
                    <option value="pwd">PWD</option>
                    <option value="solo_parent">Solo Parent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Beneficiaries List */}
            <div className="space-y-4">
              {(() => {
                const bhwAddr = user?.address || '';
                // Filter beneficiaries by barangay
                const inBarangay = (beneficiaries || []).filter((b: any) => {
                  const bAddr = b?.user?.address || b?.profiles?.address || '';
                  return matchesBarangay(bhwAddr, bAddr);
                });

                // Apply search and classification filter
                let filtered = inBarangay.filter((b: any) => {
                  const name = `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`.toLowerCase();
                  const email = (b?.user?.email || '').toLowerCase();
                  const matchesSearch = beneficiarySearch === '' || name.includes(beneficiarySearch.toLowerCase()) || email.includes(beneficiarySearch.toLowerCase());
                  
                  // Handle different classification formats (string or array)
                  let classification = b?.classification || '';
                  if (Array.isArray(classification)) {
                    classification = classification[0] || '';
                  }
                  const matchesClass = beneficiaryClassFilter === '' || classification === beneficiaryClassFilter;
                  
                  return matchesSearch && matchesClass;
                });

                // Sort by name
                filtered.sort((a, b) => {
                  const nameA = `${a?.user?.first_name || ''} ${a?.user?.last_name || ''}`;
                  const nameB = `${b?.user?.first_name || ''} ${b?.user?.last_name || ''}`;
                  return nameA.localeCompare(nameB);
                });

                // Pagination
                const itemsPerPage = 5;
                const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
                const currentPage = Math.min(Math.max(1, beneficiaryPage), totalPages);
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filtered.slice(start, start + itemsPerPage);

                if (inBarangay.length === 0) {
                  return <p className="text-gray-500 text-center py-12">No beneficiaries in your barangay</p>;
                }

                if (filtered.length === 0) {
                  return <p className="text-gray-500 text-center py-12">No beneficiaries match your search</p>;
                }

                return (
                  <>
                    {paginated.map((beneficiary: any) => (
                      <div
                        key={beneficiary.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedBeneficiary(beneficiary)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {beneficiary?.user?.first_name} {beneficiary?.user?.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">{beneficiary?.user?.email}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                                {Array.isArray(beneficiary?.classification) 
                                  ? beneficiary?.classification[0]?.replace('_', ' ') || 'N/A'
                                  : (beneficiary?.classification?.replace('_', ' ') || 'N/A')}
                              </span>
                              {beneficiary?.disability_type && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {beneficiary.disability_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{beneficiary?.user?.address}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setBeneficiaryPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border rounded-lg disabled:opacity-50"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => setBeneficiaryPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border rounded-lg disabled:opacity-50"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            {/* Filter Bar */}
            <div className="mb-6">
              <div className="relative w-48">
                <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={notificationReadFilter}
                  onChange={(e) => { setNotificationReadFilter(e.target.value); setNotificationPage(1); }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white w-full"
                >
                  <option value="">All Notifications</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>

            {notifications.length > 0 && unreadCount > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                // Filter notifications by read status
                let filtered = notifications.filter((notification) => {
                  if (!notificationReadFilter) return true;
                  if (notificationReadFilter === 'unread') return !notification.is_read;
                  if (notificationReadFilter === 'read') return notification.is_read;
                  return true;
                });

                // Sort by creation date (newest first)
                filtered.sort((a, b) => {
                  const dateA = new Date(a.created_at || 0).getTime();
                  const dateB = new Date(b.created_at || 0).getTime();
                  return dateB - dateA;
                });

                // Pagination
                const itemsPerPage = 5;
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const start = (notificationPage - 1) * itemsPerPage;
                const paginatedNotifications = filtered.slice(start, start + itemsPerPage);

                return (
                  <>
                    {filtered.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 text-lg">No notifications</p>
                    ) : (
                      <>
                        {paginatedNotifications.map((notification) => (
                          <div key={notification.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                              </div>
                              {!notification.is_read && (
                                <button
                                  onClick={() => markNotificationAsRead(notification.id)}
                                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {totalPages > 1 && (
                          <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page {notificationPage} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setNotificationPage(p => Math.max(1, p - 1))}
                                disabled={notificationPage === 1}
                                className="px-3 py-2 border rounded-lg disabled:opacity-50"
                              >
                                ← Previous
                              </button>
                              <button
                                onClick={() => setNotificationPage(p => Math.min(totalPages, p + 1))}
                                disabled={notificationPage === totalPages}
                                className="px-3 py-2 border rounded-lg disabled:opacity-50"
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

          {activeTab === 'reports' && selectedReport && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
                      <button onClick={() => setSelectedReport(null)} className="text-gray-500 hover:text-gray-700"><XCircle className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Full Name</p>
                        <p className="text-gray-900">{selectedReport?.full_name || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                        <p className="text-gray-900">{selectedReport?.date_of_birth ? new Date(selectedReport.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Date/Time of Death</p>
                        <p className="text-gray-900">{selectedReport?.date_time_of_death ? new Date(selectedReport.date_time_of_death).toLocaleString() : 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Beneficiary</p>
                        <p className="text-gray-900">{selectedReport?.beneficiary_name || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Barangay</p>
                        <p className="text-gray-900">{selectedReport?.beneficiary_barangay || selectedReport?.address || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">Source</p>
                        <p className="text-gray-900">{selectedReport?.source_of_information || 'N/A'}</p>
                      </div>

                      {selectedReport?.cause_of_death && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Cause of Death</p>
                          <p className="text-gray-900">{selectedReport.cause_of_death}</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">Reported: {selectedReport?.created_at ? new Date(selectedReport.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {activeTab === 'notifications' && (
          <div>
            {/* Filter Bar */}
            <div className="mb-6">
              <div className="relative w-48">
                <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={notificationReadFilter}
                  onChange={(e) => { setNotificationReadFilter(e.target.value); setNotificationPage(1); }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white w-full"
                >
                  <option value="">All Notifications</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>

            {notifications.length > 0 && unreadCount > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                // Filter notifications by read status
                let filtered = notifications.filter((notification) => {
                  if (!notificationReadFilter) return true;
                  if (notificationReadFilter === 'unread') return !notification.is_read;
                  if (notificationReadFilter === 'read') return notification.is_read;
                  return true;
                });

                // Sort by creation date (newest first)
                filtered.sort((a, b) => {
                  const dateA = new Date(a.created_at || 0).getTime();
                  const dateB = new Date(b.created_at || 0).getTime();
                  return dateB - dateA;
                });

                // Pagination
                const itemsPerPage = 5;
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const start = (notificationPage - 1) * itemsPerPage;
                const paginatedNotifications = filtered.slice(start, start + itemsPerPage);

                return (
                  <>
                    {filtered.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 text-lg">No notifications</p>
                    ) : (
                      <>
                        {paginatedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-300'
                            }`}
                            onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start flex-1">
                                <Bell className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${notification.is_read ? 'text-gray-400' : 'text-blue-600'}`} />
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <h4 className={`font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                      {notification.title}
                                    </h4>
                                    {!notification.is_read && (
                                      <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markNotificationAsRead(notification.id);
                                  }}
                                  className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page <span className="font-semibold">{notificationPage}</span> of <span className="font-semibold">{totalPages}</span> ({filtered.length} notifications)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setNotificationPage(p => Math.max(1, p - 1))}
                                disabled={notificationPage === 1}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" /> Previous
                              </button>
                              <button
                                onClick={() => setNotificationPage(p => Math.min(totalPages, p + 1))}
                                disabled={notificationPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
            </div>
          </div>
        </div>

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Details</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">Beneficiary</p>
                  <p className="text-gray-900">{getBeneficiaryFirstName(selectedApp)} {getBeneficiaryLastName(selectedApp)}</p>
                  <p className="text-sm text-gray-500">{getBeneficiaryEmail(selectedApp)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Program</p>
                  <p className="text-gray-900">{getProgramName(selectedApp)}</p>
                </div>

                {selectedApp.form_data && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason for Application</p>
                      <p className="text-gray-900">{selectedApp.form_data.reason}</p>
                    </div>
                    {selectedApp.form_data.additional_info && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Additional Information</p>
                        <p className="text-gray-900">{selectedApp.form_data.additional_info}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</p>
                  {(() => {
                    const formDocs: any[] = [];
                    if (selectedApp.form_data) {
                      Object.entries(selectedApp.form_data).forEach(([key, value]: [string, any]) => {
                        if (value && typeof value === 'object' && value.url && !Array.isArray(value)) {
                          formDocs.push({ name: key, ...value });
                        }
                      });
                    }
                    
                    const hasDocuments = (selectedApp.application_documents && selectedApp.application_documents.length > 0) || formDocs.length > 0;
                    
                    return hasDocuments ? (
                      <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                        {selectedApp.application_documents && selectedApp.application_documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{doc.document_type || 'Document'}</p>
                              {doc.uploaded_at && (
                                <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                              )}
                            </div>
                            {doc.document_url && (
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-medium"
                              >
                                View/Download
                              </a>
                            )}
                          </div>
                        ))}
                        {formDocs.map((doc: any, idx: number) => (
                          <div key={`form-doc-${idx}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              {doc.size && (
                                <p className="text-xs text-gray-500">Size: {(doc.size / 1024).toFixed(2)} KB</p>
                              )}
                            </div>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-medium"
                              >
                                View/Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">No documents uploaded for this application</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {selectedApp.status === 'pending' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Notes
                    </label>
                    <textarea
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add notes about this application..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerify(selectedApp.id, true)}
                      disabled={verifying}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    >
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      {verifying ? 'Verifying...' : 'Verify & Forward to MSWDO'}
                    </button>
                    <button
                      onClick={() => handleVerify(selectedApp.id, false)}
                      disabled={verifying || !verifyNotes}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                    >
                      <XCircle className="w-5 h-5 inline mr-2" />
                      {verifying ? 'Processing...' : 'Deny Application'}
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setSelectedApp(null);
                  setVerifyNotes('');
                }}
                className="w-full mt-4 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgramModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Program Details</h2>
              <button
                onClick={() => {
                  setShowProgramModal(false);
                  setSelectedProgram(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedProgram.name}</h3>
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-gray-600">{selectedProgram.description}</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Program Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Target Classification</p>
                    <p className="text-gray-900 capitalize">{(selectedProgram.classification && selectedProgram.classification.length > 0) ? selectedProgram.classification.join(', ').replace(/_/g, ' ') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Program Type</p>
                    <p className="text-gray-900 capitalize">{selectedProgram.program_type ? selectedProgram.program_type.replace(/_/g, ' ') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Waiting Period</p>
                    <p className="text-gray-900">{selectedProgram.waiting_period_days ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Program Status</p>
                    <p className="text-gray-900">{selectedProgram.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              {((selectedProgram.application_start_date) || (selectedProgram.application_end_date)) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Application Period</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      {selectedProgram.application_start_date && (
                        <div>
                          <p className="text-sm font-medium text-blue-900">Start Date</p>
                          <p className="text-blue-700">{new Date(selectedProgram.application_start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedProgram.application_end_date && (
                        <div>
                          <p className="text-sm font-medium text-blue-900">End Date</p>
                          <p className="text-blue-700">{new Date(selectedProgram.application_end_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedProgram.eligibility_criteria && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Eligibility Criteria</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700">{selectedProgram.eligibility_criteria}</p>
                  </div>
                </div>
              )}

              {selectedProgram.requirements && selectedProgram.requirements.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Requirements</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      {selectedProgram.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedProgram.additional_instructions && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Additional Instructions</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-900">{selectedProgram.additional_instructions}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <button
                  onClick={() => {
                    setShowProgramModal(false);
                    setSelectedProgram(null);
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {notifications.length > 0 && unreadCount > 0 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all as read
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-300'
                      }`}
                      onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <Bell className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${notification.is_read ? 'text-gray-400' : 'text-blue-600'}`} />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className={`font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id);
                            }}
                            className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBeneficiary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Beneficiary Details</h2>
              <button
                onClick={() => setSelectedBeneficiary(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <p className="text-sm font-medium text-gray-700">Full Name</p>
                <p className="text-gray-900 font-semibold">
                  {selectedBeneficiary?.user?.first_name} {selectedBeneficiary?.user?.last_name}
                </p>
              </div>

              {/* Email */}
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{selectedBeneficiary?.user?.email || 'N/A'}</p>
              </div>

              {/* Phone */}
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-gray-900">{selectedBeneficiary?.user?.phone || 'N/A'}</p>
              </div>

              {/* Address */}
              <div>
                <p className="text-sm font-medium text-gray-700">Address</p>
                <p className="text-gray-900">{selectedBeneficiary?.user?.address || 'N/A'}</p>
              </div>

              {/* Classification */}
              <div>
                <p className="text-sm font-medium text-gray-700">Classification</p>
                <div className="mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {selectedBeneficiary?.classification?.replace('_', ' ') || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Disability Type */}
              {selectedBeneficiary?.disability_type && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Disability Type</p>
                  <p className="text-gray-900">{selectedBeneficiary.disability_type}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    selectedBeneficiary?.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : selectedBeneficiary?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedBeneficiary?.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Latitude */}
              {selectedBeneficiary?.latitude && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Latitude</p>
                  <p className="text-gray-900 font-mono text-sm">{selectedBeneficiary.latitude}</p>
                </div>
              )}

              {/* Longitude */}
              {selectedBeneficiary?.longitude && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Longitude</p>
                  <p className="text-gray-900 font-mono text-sm">{selectedBeneficiary.longitude}</p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedBeneficiary(null)}
                className="w-full mt-6 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
