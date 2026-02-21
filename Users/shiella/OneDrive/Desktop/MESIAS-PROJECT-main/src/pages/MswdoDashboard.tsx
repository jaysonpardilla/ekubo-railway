import { useEffect, useState } from 'react';
import { FileText, LogOut, CheckCircle, XCircle, Calendar, User, Bell, Eye, Download, Phone, MapPin, Plus, Edit, Trash2, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { programs as programsApi, applications as applicationsApi, notifications as notificationsApi, deceasedReports as deceasedReportsApi } from '../lib/api';
import { Notification, Program, Classification } from '../types/database';
import logo from '../assets/logo.jpg';

export default function MswdoDashboard() {
  const { user, signOut } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [confirmProcessing, setConfirmProcessing] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState<string>('');
  const [appPage, setAppPage] = useState(1);
  const [programSearch, setProgramSearch] = useState('');
  const [programClassFilter, setProgramClassFilter] = useState<string>('');
  const [programPage, setProgramPage] = useState(1);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'applications' | 'programs' | 'reports'>('applications');
  const [deceasedReports, setDeceasedReports] = useState<any[]>([]);
  const [selectedReportForView, setSelectedReportForView] = useState<any | null>(null);
  const [reportPage, setReportPage] = useState(1);
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('');
  const [reportYearFilter, setReportYearFilter] = useState<string>('');
  const [scheduleData, setScheduleData] = useState({
    release_date: '',
    release_time: '',
    venue: '',
    instructions: '',
  });
  const [newProgram, setNewProgram] = useState({
    name: '',
    description: '',
    target_classifications: ['senior_citizen'] as Classification[],
    requirements: '',
    program_type: 'cash_assistance' as 'cash_assistance' | 'medical' | 'educational' | 'livelihood',
    application_start_date: '',
    application_end_date: '',
    eligibility_criteria: '',
    additional_instructions: '',
    waiting_period_days: 0,
    is_one_time: false,
    target_disability_types: [] as string[],
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Prefer backend API for applications so MSWDO sees Django-created records
      try {
        const apps = await applicationsApi.getAll();
        const normalized = (apps || []).map((a: any) => ({
          ...a,
          programs: { id: a.program || a.program?.id, name: a.program_name || a.program?.name, description: a.program?.description },
          beneficiaries: { profiles: { first_name: a.first_name || a.beneficiary?.user?.first_name || '', middle_name: '', last_name: a.last_name || a.beneficiary?.user?.last_name || '', address: a.beneficiary_address || a.beneficiary?.user?.address || '', user_id: a.beneficiary_user_id || (a.beneficiary && a.beneficiary.user) || null } },
          application_documents: a.documents || a.application_documents || [],
          release_schedules: a.release_schedules || [],
          created_at: a.created_at,
          status: a.status,
          form_data: a.form_data || {}
        }));

        setApplications(normalized);
      } catch (err) {
        console.error('Error loading applications from API:', err);
        setApplications([]);
      }

      try {
        const programsData = await programsApi.getAll();
        setPrograms(programsData || []);
      } catch (err) {
        console.error('Error loading programs from API:', err);
        setPrograms([]);
      }

      try {
        const notificationsData = await notificationsApi.getAll();
        setNotifications(notificationsData || []);
        setUnreadCount(notificationsData?.filter((n: any) => !n.is_read).length || 0);
      } catch (err) {
        console.error('Error loading notifications from API:', err);
        setNotifications([]);
        setUnreadCount(0);
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

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
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

  const handleApprove = async (applicationId: string, approved: boolean) => {
    if (!user) return;

    setProcessing(true);
    try {
      // ensure BHW has verified before MSWDO approves
      const current = await applicationsApi.getById(applicationId);
      if (approved && current.status !== 'bhw_verified') {
        alert('This application must be BHW-verified before MSWDO approval.');
        setProcessing(false);
        return;
      }

      const payload: any = { status: approved ? 'mswdo_approved' : 'denied' };
      if (approvalNotes) {
        payload.mswdoNotes = approvalNotes;
        if (!approved) payload.denialReason = approvalNotes || 'Application denied by MSWDO';
      }

      await applicationsApi.update(applicationId, payload);

      setShowViewModal(false);

      if (approved) {
        setShowScheduleModal(true);
      } else {
        setSelectedApp(null);
        setApprovalNotes('');
      }

      fetchData();
    } catch (err: any) {
      console.error('Approval error:', err);
      alert('Failed to process application');
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleRelease = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      // Call backend API to create release schedule
      await applicationsApi.createSchedule(selectedApp.id, scheduleData);

      setShowScheduleModal(false);
      setSelectedApp(null);
      setApprovalNotes('');
      setScheduleData({ release_date: '', release_time: '', venue: '', instructions: '' });
      fetchData();
    } catch (err: any) {
      console.error('Schedule error:', err);
      alert('Failed to schedule release: ' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsClaimed = async () => {
    if (!selectedApp || !user) return;

    setProcessing(true);
    try {
      // Prefer backend API to mark schedule as claimed
      try {
        await applicationsApi.claimSchedule(selectedApp.id, { notes: claimNotes });
        setShowClaimModal(false);
        setSelectedApp(null);
        setClaimNotes('');
        fetchData();
      } catch (apiErr) {
        console.error('Claim via API failed:', apiErr);
        alert('Failed to mark as claimed — backend unavailable. Please try again later.');
        setShowClaimModal(false);
        setSelectedApp(null);
        setClaimNotes('');
        fetchData();
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      alert('Failed to mark as claimed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setProcessing(true);
    try {
      const requirementsArray = newProgram.requirements
        .split('\n')
        .filter(r => r.trim() !== '');

      if (editingProgram) {
        // Only send fields supported by backend ProgramSerializer
        const payload: any = {
          name: newProgram.name,
          description: newProgram.description,
          classification: newProgram.target_classifications,
          requirements: requirementsArray,
          program_type: newProgram.program_type,
          is_active: editingProgram.is_active,
        };

        await programsApi.update(editingProgram.id as string, payload);
        alert('Program updated successfully!');
      } else {
        const payload: any = {
          name: newProgram.name,
          description: newProgram.description,
          classification: newProgram.target_classifications,
          requirements: requirementsArray,
          program_type: newProgram.program_type,
          is_active: true,
        };

        await programsApi.create(payload);
        alert('Program created successfully!');
      }

      setShowProgramModal(false);
      setEditingProgram(null);
      setNewProgram({
        name: '',
        description: '',
        target_classifications: ['senior_citizen'],
        requirements: '',
        program_type: 'cash_assistance',
        application_start_date: '',
        application_end_date: '',
        eligibility_criteria: '',
        additional_instructions: '',
        waiting_period_days: 0,
        is_one_time: false,
        target_disability_types: [],
      });
      fetchData();
    } catch (err: any) {
      console.error('Create/Update program error:', err);
      alert('Failed to save program: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setNewProgram({
      name: program.name,
      description: program.description,
      target_classifications: program.target_classifications || [program.target_classification || 'senior_citizen'],
      requirements: program.requirements.join('\n'),
      program_type: program.program_type,
      application_start_date: program.application_start_date || '',
      application_end_date: program.application_end_date || '',
      eligibility_criteria: program.eligibility_criteria || '',
      additional_instructions: program.additional_instructions || '',
      waiting_period_days: program.waiting_period_days,
      is_one_time: program.is_one_time,
      target_disability_types: program.target_disability_types || [],
    });
    setShowProgramModal(true);
  };

  const handleToggleProgramStatus = async (programId: string, currentStatus: boolean) => {
    setProcessing(true);
    try {
      await programsApi.update(programId, { is_active: !currentStatus });

      fetchData();
    } catch (err: any) {
      console.error('Toggle program status error:', err);
      alert('Failed to update program status');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    try {
      await programsApi.delete(programId);

      fetchData();
      alert('Program deleted successfully!');
    } catch (err: any) {
      console.error('Delete program error:', err);
      alert('Failed to delete program: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending BHW' },
      bhw_verified: { color: 'bg-blue-100 text-blue-800', text: 'Ready for Approval' },
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
                <p className="text-xs text-gray-500">MSWDO Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNotifications(s => !s)}
                className="relative flex items-center text-gray-700 hover:text-gray-900 p-2 rounded-full"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

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
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Applications
              </button>
              <button
                onClick={() => setActiveTab('programs')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'programs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Folder className="w-5 h-5 inline mr-2" />
                Programs ({programs.length})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Reports
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'applications' && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Pending BHW</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {applications.filter(app => app.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">For Approval</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {applications.filter(app => app.status === 'bhw_verified').length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-800">
                    {applications.filter(app => app.status === 'mswdo_approved').length}
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {applications.filter(app => app.status === 'scheduled').length}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Claimed</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {applications.filter(app => app.status === 'claimed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">All Applications</h2>
              </div>
              <div className="p-6 border-b border-gray-200 space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Search by beneficiary or program..."
                    value={appSearch}
                    onChange={(e) => {
                      setAppSearch(e.target.value);
                      setAppPage(1);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg text-sm"
                  />
                  <select
                    value={appStatusFilter}
                    onChange={(e) => {
                      setAppStatusFilter(e.target.value);
                      setAppPage(1);
                    }}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending BHW</option>
                    <option value="bhw_verified">Ready for Approval</option>
                    <option value="mswdo_approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="claimed">Claimed</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              </div>
          <div className="divide-y divide-gray-200">
            {(() => {
              const itemsPerPage = 4;
              const filtered = applications.filter(app => {
                const beneficiaryName = `${app.beneficiaries.profiles.first_name} ${app.beneficiaries.profiles.last_name}`.toLowerCase();
                const programName = app.programs.name.toLowerCase();
                const matchesSearch = appSearch === '' || beneficiaryName.includes(appSearch.toLowerCase()) || programName.includes(appSearch.toLowerCase());
                const matchesStatus = appStatusFilter === '' || app.status === appStatusFilter;
                return matchesSearch && matchesStatus;
              });

              const totalPages = Math.ceil(filtered.length / itemsPerPage);
              const start = (appPage - 1) * itemsPerPage;
              const paginatedApps = filtered.slice(start, start + itemsPerPage);

              if (filtered.length === 0) {
                return <div className="p-8 text-center text-gray-500">No applications found</div>;
              }

              return (
                <>
                  {paginatedApps.map((application) => (
                    <div key={application.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <User className="w-5 h-5 text-gray-400 mr-2" />
                            <h3 className="font-semibold text-gray-900">
                              {application.beneficiaries.profiles.first_name}{' '}
                              {application.beneficiaries.profiles.last_name}
                            </h3>
                          </div>
                          <p className="text-gray-600">{application.programs.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Applied: {new Date(application.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Barangay: {application.beneficiaries.profiles.address}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(application.status)}
                          <button
                            onClick={() => {
                              setSelectedApp(application);
                              setShowViewModal(true);
                            }}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </button>
                        </div>
                      </div>

                      {application.status === 'mswdo_approved' && !application.release_schedules?.length && (
                        <button
                          onClick={() => {
                            setSelectedApp(application);
                            setShowScheduleModal(true);
                          }}
                          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mt-4"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Release
                        </button>
                      )}

                      {application.status === 'scheduled' && (
                        <div className="mt-4 space-y-2">
                          {application.release_schedules?.[0] && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                              <p className="text-sm font-medium text-indigo-900">Release Schedule:</p>
                              <p className="text-sm text-indigo-700">
                                {new Date(application.release_schedules[0].release_date).toLocaleDateString()} at {application.release_schedules[0].venue}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setSelectedApp(application);
                              setShowClaimModal(true);
                            }}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Claimed
                          </button>
                        </div>
                      )}

                      {application.status === 'claimed' && application.release_schedules?.[0]?.claimed_at && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3">
                          <p className="text-sm font-medium text-gray-900">Claimed Information:</p>
                          <p className="text-sm text-gray-700">
                            Claimed on: {new Date(application.release_schedules[0].claimed_at).toLocaleString()}
                          </p>
                          {application.release_schedules[0].notes && (
                            <p className="text-sm text-gray-700 mt-1">
                              Notes: {application.release_schedules[0].notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page {appPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAppPage(prev => Math.max(1, prev - 1))}
                          disabled={appPage === 1}
                          className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                        >
                          ← Previous
                        </button>
                        <button
                          onClick={() => setAppPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={appPage === totalPages}
                          className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
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
          </>
        )}

        {activeTab === 'programs' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Programs Management</h2>
              <button
                onClick={() => setShowProgramModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Program
              </button>
            </div>
            <div className="p-6 border-b border-gray-200 space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search by program name..."
                  value={programSearch}
                  onChange={(e) => {
                    setProgramSearch(e.target.value);
                    setProgramPage(1);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm"
                />
                <select
                  value={programClassFilter}
                  onChange={(e) => {
                    setProgramClassFilter(e.target.value);
                    setProgramPage(1);
                  }}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Classifications</option>
                  <option value="senior_citizen">Senior Citizen</option>
                  <option value="pwd">PWD</option>
                  <option value="solo_parent">Solo Parent</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {(() => {
                const itemsPerPage = 3;
                const filtered = programs.filter(program => {
                  const matchesSearch = programSearch === '' || program.name.toLowerCase().includes(programSearch.toLowerCase()) || program.description.toLowerCase().includes(programSearch.toLowerCase());
                  const hasClassification = (prog: any) => {
                    if (!prog) return false;
                    if (prog.classification) {
                      return Array.isArray(prog.classification)
                        ? prog.classification.includes(programClassFilter)
                        : String(prog.classification) === programClassFilter;
                    }
                    if (prog.target_classifications) {
                      return prog.target_classifications.includes(programClassFilter);
                    }
                    if (prog.target_classification) {
                      return prog.target_classification === programClassFilter;
                    }
                    return false;
                  };

                  const matchesClass = programClassFilter === '' || hasClassification(program);
                  return matchesSearch && matchesClass;
                });

                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const start = (programPage - 1) * itemsPerPage;
                const paginatedPrograms = filtered.slice(start, start + itemsPerPage);

                if (filtered.length === 0) {
                  return <div className="p-8 text-center text-gray-500">No programs found</div>;
                }

                return (
                  <>
                    {paginatedPrograms.map((program) => (
                      <div key={program.id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg">{program.name}</h3>
                              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {program.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-2">{program.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                              <div>
                                <span className="font-medium">Classification:</span>{' '}
                                <span className="capitalize">
                                  {(
                                    (program.classification && (
                                      Array.isArray(program.classification)
                                        ? program.classification.map((c: string) => c.replace('_', ' ')).join(', ')
                                        : String(program.classification).replace('_', ' ')
                                    )) ||
                                    (program.target_classifications?.map((c: string) => c.replace('_', ' ')).join(', ')) ||
                                    (program.target_classification ? program.target_classification.replace('_', ' ') : 'N/A')
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Type:</span>{' '}
                                <span className="capitalize">{program.program_type.replace('_', ' ')}</span>
                              </div>
                              <div>
                                <span className="font-medium">Waiting Period:</span> {program.waiting_period_days} days
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
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditProgram(program)}
                              disabled={processing}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleProgramStatus(program.id, program.is_active)}
                              disabled={processing}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                program.is_active
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:opacity-50`}
                            >
                              {program.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteProgram(program.id)}
                              disabled={processing}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

                    {totalPages > 1 && (
                      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Page {programPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setProgramPage(prev => Math.max(1, prev - 1))}
                            disabled={programPage === 1}
                            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => setProgramPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={programPage === totalPages}
                            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
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

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Deceased Reports</h2>
              <p className="text-sm text-gray-600">All barangays — newest first</p>
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

            <div className="space-y-4">
              {(() => {
                // Build filtered list (default: all) and paginate 4 per page
                const filtered = (deceasedReports || []).slice().sort((a,b) => (new Date(b.created_at || b.date_time_of_death || 0).getTime()) - (new Date(a.created_at || a.date_time_of_death || 0).getTime()));
                // apply month/year filters
                const filteredByDate = filtered.filter((r: any) => {
                  if (!reportMonthFilter && !reportYearFilter) return true;
                  const dt = r?.date_time_of_death ? new Date(r.date_time_of_death) : (r?.created_at ? new Date(r.created_at) : null);
                  if (!dt) return false;
                  if (reportMonthFilter && String(dt.getMonth() + 1) !== reportMonthFilter) return false;
                  if (reportYearFilter && String(dt.getFullYear()) !== reportYearFilter) return false;
                  return true;
                });

                const itemsPerPage = 4;
                const totalPages = Math.max(1, Math.ceil(filteredByDate.length / itemsPerPage));
                const currentPage = Math.min(Math.max(1, reportPage), totalPages);
                const start = (currentPage - 1) * itemsPerPage;
                const paginated = filteredByDate.slice(start, start + itemsPerPage);

                if (filtered.length === 0) return <p className="text-gray-500 text-center py-12">No reports found</p>;

                return (
                  <>
                    {paginated.map((r: any) => (
                      <div key={r.id} className="border border-gray-200 rounded-lg p-4 cursor-pointer" onClick={() => setSelectedReportForView(r)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{r.full_name}</h3>
                            <p className="text-sm text-gray-500">Reported: {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}</p>
                            <p className="text-sm text-gray-500">Barangay: {r.beneficiary_barangay || r.address || 'N/A'}</p>
                          </div>
                          <div className="text-xs text-gray-500">{r.source_of_information || 'N/A'}</div>
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 flex items-center justify-between">
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
      </div>

      {showViewModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedApp(null);
                  setApprovalNotes('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">Application Status</p>
                    <div className="mt-2">{getStatusBadge(selectedApp.status)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Application ID</p>
                    <p className="text-sm font-mono text-gray-900 mt-1">{selectedApp.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Beneficiary Information</h3>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Full Name</p>
                    <p className="text-gray-900">
                      {selectedApp.beneficiaries.profiles.first_name}{' '}
                      {selectedApp.beneficiaries.profiles.middle_name && selectedApp.beneficiaries.profiles.middle_name + ' '}
                      {selectedApp.beneficiaries.profiles.last_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center">
                      <Phone className="w-4 h-4 mr-1" /> Contact Number
                    </p>
                    <p className="text-gray-900">{selectedApp.beneficiaries.profiles.contact_number || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" /> Address
                    </p>
                    <p className="text-gray-900">{selectedApp.beneficiaries.profiles.address}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                    <p className="text-gray-900">
                      {selectedApp.beneficiaries.date_of_birth
                        ? new Date(selectedApp.beneficiaries.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Disability Information</h3>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Classification</p>
                    <p className="text-gray-900 capitalize">{selectedApp.beneficiaries.classification || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Disability Type</p>
                    <p className="text-gray-900">{selectedApp.beneficiaries.disability_type || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">PWD ID Number</p>
                    <p className="text-gray-900">{selectedApp.beneficiaries.pwd_id_number || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Guardian Name</p>
                    <p className="text-gray-900">{selectedApp.beneficiaries.guardian_name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Program Details</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-900">{selectedApp.programs.name}</p>
                  <p className="text-sm text-blue-700 mt-1">{selectedApp.programs.description}</p>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Target Classification: <span className="font-medium capitalize">{selectedApp.programs.target_classification}</span></p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Uploaded Documents</h3>
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
                    <div className="grid grid-cols-1 gap-3">
                      {selectedApp.application_documents && selectedApp.application_documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-500 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.document_type}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View
                          </a>
                        </div>
                      ))}
                      {formDocs.map((doc: any, idx: number) => (
                        <div key={`form-doc-${idx}`} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-500 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">
                                Size: {(doc.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                      <p className="text-sm text-gray-500">No documents uploaded for this application</p>
                    </div>
                  );
                })()}
              </div>

              {selectedApp.bhw_verified_at && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-3">BHW Verification</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900">
                      <span className="font-medium">Verified on:</span>{' '}
                      {new Date(selectedApp.bhw_verified_at).toLocaleString()}
                    </p>
                    {selectedApp.bhw_notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-900">BHW Notes:</p>
                        <p className="text-sm text-green-700 mt-1">{selectedApp.bhw_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Application Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="text-gray-900">{new Date(selectedApp.created_at).toLocaleString()}</span>
                  </div>
                  {selectedApp.bhw_verified_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">BHW Verified:</span>
                      <span className="text-gray-900">{new Date(selectedApp.bhw_verified_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedApp.mswdo_approved_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">MSWDO Approved:</span>
                      <span className="text-gray-900">{new Date(selectedApp.mswdo_approved_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedApp.status === 'bhw_verified' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-3">MSWDO Decision</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision Notes {selectedApp.status === 'bhw_verified' && '(Required for denial)'}
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add your notes about this application..."
                    />
                  </div>

                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => handleApprove(selectedApp.id, true)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : 'Approve Application'}
                    </button>
                    <button
                      onClick={() => handleApprove(selectedApp.id, false)}
                      disabled={processing || !approvalNotes}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : 'Deny Application'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Denial requires notes to inform the beneficiary
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Release</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Release Date
                </label>
                <input
                  type="date"
                  value={scheduleData.release_date}
                  onChange={(e) => setScheduleData({ ...scheduleData, release_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Release Time
                </label>
                <input
                  type="time"
                  value={scheduleData.release_time}
                  onChange={(e) => setScheduleData({ ...scheduleData, release_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <input
                  type="text"
                  value={scheduleData.venue}
                  onChange={(e) => setScheduleData({ ...scheduleData, venue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="MSWDO Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={scheduleData.instructions}
                  onChange={(e) => setScheduleData({ ...scheduleData, instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Bring valid ID and approval slip..."
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleScheduleRelease}
                disabled={processing || !scheduleData.release_date || !scheduleData.venue}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {processing ? 'Scheduling...' : 'Schedule Release'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleData({ release_date: '', release_time: '', venue: '', instructions: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClaimModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mark as Claimed</h2>

            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm font-medium text-blue-900">Beneficiary:</p>
                <p className="text-sm text-blue-700">
                  {selectedApp.beneficiaries.profiles.first_name} {selectedApp.beneficiaries.profiles.last_name}
                </p>
                <p className="text-sm font-medium text-blue-900 mt-2">Program:</p>
                <p className="text-sm text-blue-700">{selectedApp.programs.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claiming Notes (Optional)
                </label>
                <textarea
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Enter any notes about the claiming process..."
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleMarkAsClaimed}
                disabled={processing}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {processing ? 'Processing...' : 'Confirm Claimed'}
              </button>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimNotes('');
                  setSelectedApp(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProgram ? 'Edit Program' : 'Create New Program'}
              </h2>
              <button
                onClick={() => {
                  setShowProgramModal(false);
                  setEditingProgram(null);
                  setNewProgram({
                    name: '',
                    description: '',
                    target_classifications: ['senior_citizen'],
                    requirements: '',
                    program_type: 'cash_assistance',
                    application_start_date: '',
                    application_end_date: '',
                    eligibility_criteria: '',
                    additional_instructions: '',
                    waiting_period_days: 0,
                    is_one_time: false,
                    target_disability_types: [],
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Classifications * (Select all that apply)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProgram.target_classifications.includes('senior_citizen')}
                      onChange={(e) => {
                        const classifications = e.target.checked
                          ? [...newProgram.target_classifications, 'senior_citizen']
                          : newProgram.target_classifications.filter(c => c !== 'senior_citizen');
                        setNewProgram({ ...newProgram, target_classifications: classifications as Classification[] });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Senior Citizen</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProgram.target_classifications.includes('pwd')}
                      onChange={(e) => {
                        const classifications = e.target.checked
                          ? [...newProgram.target_classifications, 'pwd']
                          : newProgram.target_classifications.filter(c => c !== 'pwd');
                        setNewProgram({ ...newProgram, target_classifications: classifications as Classification[] });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">PWD (Person with Disability)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProgram.target_classifications.includes('solo_parent')}
                      onChange={(e) => {
                        const classifications = e.target.checked
                          ? [...newProgram.target_classifications, 'solo_parent']
                          : newProgram.target_classifications.filter(c => c !== 'solo_parent');
                        setNewProgram({ ...newProgram, target_classifications: classifications as Classification[] });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Solo Parent</span>
                  </label>
                </div>
                {newProgram.target_classifications.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">Please select at least one classification</p>
                )}
              </div>

              {newProgram.target_classifications.includes('pwd') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specific Disability Types (Optional - leave empty for all PWD types)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { value: 'physical', label: 'Physical/Orthopedic' },
                      { value: 'visual', label: 'Visual' },
                      { value: 'hearing', label: 'Hearing' },
                      { value: 'speech', label: 'Speech' },
                      { value: 'intellectual', label: 'Intellectual' },
                      { value: 'psychosocial', label: 'Psychosocial' },
                      { value: 'autism', label: 'Autism Spectrum' },
                      { value: 'chronic_illness', label: 'Chronic Illness' },
                      { value: 'multiple', label: 'Multiple Disabilities' },
                    ].map((disability) => (
                      <label key={disability.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newProgram.target_disability_types.includes(disability.value)}
                          onChange={(e) => {
                            const types = e.target.checked
                              ? [...newProgram.target_disability_types, disability.value]
                              : newProgram.target_disability_types.filter(t => t !== disability.value);
                            setNewProgram({ ...newProgram, target_disability_types: types });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{disability.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    If no specific types are selected, the program will be available to all PWD beneficiaries
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Type *
                </label>
                <select
                  value={newProgram.program_type}
                  onChange={(e) => setNewProgram({ ...newProgram, program_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="cash_assistance">Cash Assistance</option>
                  <option value="medical">Medical</option>
                  <option value="educational">Educational</option>
                  <option value="livelihood">Livelihood</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements (one per line)
                </label>
                <textarea
                  value={newProgram.requirements}
                  onChange={(e) => setNewProgram({ ...newProgram, requirements: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Valid ID&#10;Proof of residency&#10;Medical certificate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eligibility Criteria
                </label>
                <textarea
                  value={newProgram.eligibility_criteria}
                  onChange={(e) => setNewProgram({ ...newProgram, eligibility_criteria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Detailed eligibility requirements..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Start Date
                  </label>
                  <input
                    type="date"
                    value={newProgram.application_start_date}
                    onChange={(e) => setNewProgram({ ...newProgram, application_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application End Date
                  </label>
                  <input
                    type="date"
                    value={newProgram.application_end_date}
                    onChange={(e) => setNewProgram({ ...newProgram, application_end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Instructions
                </label>
                <textarea
                  value={newProgram.additional_instructions}
                  onChange={(e) => setNewProgram({ ...newProgram, additional_instructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional instructions for applicants..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waiting Period (days)
                  </label>
                  <input
                    type="number"
                    value={newProgram.waiting_period_days}
                    onChange={(e) => setNewProgram({ ...newProgram, waiting_period_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProgram.is_one_time}
                      onChange={(e) => setNewProgram({ ...newProgram, is_one_time: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">One-time program</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={processing || newProgram.target_classifications.length === 0}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {processing ? (editingProgram ? 'Updating...' : 'Creating...') : (editingProgram ? 'Update Program' : 'Create Program')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProgramModal(false);
                    setEditingProgram(null);
                    setNewProgram({
                      name: '',
                      description: '',
                      target_classifications: ['senior_citizen'],
                      requirements: '',
                      program_type: 'cash_assistance',
                      application_start_date: '',
                      application_end_date: '',
                      eligibility_criteria: '',
                      additional_instructions: '',
                      waiting_period_days: 0,
                      is_one_time: false,
                      target_disability_types: [],
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReportForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Deceased Report Details</h2>
              <button
                onClick={() => setSelectedReportForView(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Full Name</p>
                    <p className="text-gray-900 text-lg font-semibold">{selectedReportForView.full_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Date of Birth</p>
                    <p className="text-gray-900">
                      {selectedReportForView.date_of_birth
                        ? new Date(selectedReportForView.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Gender</p>
                    <p className="text-gray-900 capitalize">{selectedReportForView.gender || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Contact Number</p>
                    <p className="text-gray-900">{selectedReportForView.phone_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Date & Time of Death</p>
                    <p className="text-gray-900">
                      {selectedReportForView.date_time_of_death
                        ? new Date(selectedReportForView.date_time_of_death).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Cause of Death</p>
                    <p className="text-gray-900">{selectedReportForView.cause_of_death || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Nationality</p>
                    <p className="text-gray-900">{selectedReportForView.nationality || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Address</p>
                    <p className="text-gray-900">{selectedReportForView.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 text-lg mb-4">Beneficiary Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Beneficiary Name</p>
                    <p className="text-gray-900">{selectedReportForView.beneficiary_name || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Barangay</p>
                    <p className="text-gray-900">{selectedReportForView.beneficiary_barangay || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 text-lg mb-4">Report Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Source of Information</p>
                    <p className="text-gray-900">{selectedReportForView.source_of_information || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium">Email</p>
                    <p className="text-gray-900">{selectedReportForView.email || 'N/A'}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 font-medium">Reported At</p>
                    <p className="text-gray-900">
                      {selectedReportForView.created_at
                        ? new Date(selectedReportForView.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedReportForView.confirmed && (
                <div className="border-t pt-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">✓ Report Confirmed</p>
                    <p className="text-sm text-green-700 mt-1">
                      Confirmed on {selectedReportForView.confirmed_at
                        ? new Date(selectedReportForView.confirmed_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-6 flex gap-2 justify-end">
                <button
                  onClick={() => setSelectedReportForView(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
                {!selectedReportForView.confirmed && (
                  <button
                    onClick={async () => {
                      if (!confirm('Confirm this deceased report? This will delete all associated programs and applications for this beneficiary.')) return;
                      setConfirmProcessing(true);
                      try {
                        const res = await deceasedReportsApi.confirm(selectedReportForView.id);
                        alert('Report confirmed. ' + (res?.deleted_applications ? `Deleted ${res.deleted_applications} application(s).` : ''));
                        setSelectedReportForView(null);
                        fetchData();
                      } catch (err: any) {
                        console.error('Failed to confirm report:', err);
                        alert('Failed to confirm report: ' + (err.message || err));
                      } finally {
                        setConfirmProcessing(false);
                      }
                    }}
                    disabled={confirmProcessing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:opacity-50 font-medium"
                  >
                    {confirmProcessing ? 'Confirming...' : 'Confirm & Delete Programs'}
                  </button>
                )}
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

              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <label className="text-sm text-gray-600">Filter:</label>
                  <select
                    value={notificationFilter}
                    onChange={(e) => setNotificationFilter(e.target.value as any)}
                    className="px-2 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500">{notifications.length} total</div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const filtered = notifications.filter(n =>
                    notificationFilter === 'all' || (notificationFilter === 'unread' && !n.is_read) || (notificationFilter === 'read' && n.is_read)
                  );

                  if (filtered.length === 0) {
                    return <p className="text-gray-500 text-center py-8">No notifications</p>;
                  }

                  return filtered.map((notification) => (
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
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
