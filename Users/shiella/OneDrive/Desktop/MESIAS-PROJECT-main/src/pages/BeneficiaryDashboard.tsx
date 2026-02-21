import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Bell,
  LogOut,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import logo from '../assets/logo.jpg';
import { useAuth } from '../contexts/AuthContext';
import { programs as programsApi, applications as applicationsApi, notifications as notificationsApi, beneficiaries as beneficiariesApi, upload as uploadApi } from '../lib/api';

export default function BeneficiaryDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [beneficiary, setBeneficiary] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programs' | 'applications' | 'notifications'>('programs');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [programPage, setProgramPage] = useState(1);
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>('');
  const [applicationPage, setApplicationPage] = useState(1);
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('');
  const [notificationPage, setNotificationPage] = useState(1);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch beneficiary record for this user
      try {
        const ben = await beneficiariesApi.getByUserId(user.id);
        setBeneficiary(ben || null);
      } catch (err) {
        console.warn('No beneficiary record found for user or error fetching beneficiary:', err);
        setBeneficiary(null);
      }

      // Fetch programs
      const programsData = await programsApi.getAll();
      setPrograms(programsData || []);

      // Fetch applications for this user and normalize to include documents
      const applicationsData = await applicationsApi.getAll();
      const normalized = (applicationsData || []).map((a: any) => ({
        ...a,
        application_documents: a.documents || a.application_documents || [],
      }));
      setApplications(normalized || []);

      // Fetch notifications for this user
      const notificationsData = await notificationsApi.getAll();
      setNotifications(notificationsData || []);
      setUnreadCount(notificationsData?.filter((n: any) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      setPrograms([]);
      setApplications([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const canApplyToProgram = (program: any): { canApply: boolean; reason?: string } => {
    // Normalize ID comparison to strings to account for differing shapes/types
    const programIdStr = String(program.id);
    const programApplications = applications.filter(app => {
      const appProgramId = app.program || app.program_id || app.programs?.id || app.programs?.program || (app.programs && app.programs.id);
      return String(appProgramId) === programIdStr;
    });

    if (programApplications.length === 0) {
      return { canApply: true };
    }

    const approvedApplications = programApplications.filter(
      app => ['mswdo_approved', 'scheduled', 'claimed'].includes(app.status)
    );

    if (approvedApplications.length === 0) {
      const pendingApp = programApplications.find(app => ['pending', 'bhw_verified'].includes(app.status));
      if (pendingApp) {
        return { canApply: false, reason: 'You have a pending application for this program' };
      }
      return { canApply: true };
    }

    if (program.is_one_time) {
      return { canApply: false, reason: 'You can only apply once for this program' };
    }

    if (program.waiting_period_days > 0) {
      const latestApproval = approvedApplications.sort((a, b) =>
        new Date(b.mswdo_approved_at || b.created_at).getTime() -
        new Date(a.mswdo_approved_at || a.created_at).getTime()
      )[0];

      const approvalDate = new Date(latestApproval.mswdo_approved_at || latestApproval.created_at);
      const daysSinceApproval = Math.floor(
        (new Date().getTime() - approvalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceApproval < program.waiting_period_days) {
        const daysRemaining = program.waiting_period_days - daysSinceApproval;
        return {
          canApply: false,
          reason: `You can apply again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
        };
      }
    }

    return { canApply: true };
  };;

  const handleApplyToProgram = (programId: string) => {
    navigate(`/beneficiary/apply/${programId}`);
  };

  const [applyingProgramId, setApplyingProgramId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyProgram, setApplyProgram] = useState<any | null>(null);
  const [applyFormValues, setApplyFormValues] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);

  const handleApplyNow = async (program: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Open modal to fill requirements
    setApplyProgram(program);
    // initialize form values from program.requirements
    const reqs = Array.isArray(program.requirements)
      ? program.requirements
      : (typeof program.requirements === 'string' ? program.requirements.split('\n').map(r => r.trim()).filter(Boolean) : []);

    const initial: Record<string, any> = {};
    // include reason and classification fields
    initial['reason'] = '';
    if (beneficiary?.classification) initial['classification'] = beneficiary.classification;
    reqs.forEach((r: string, idx: number) => {
      // use the requirement text as key (safe fallback to index)
      const key = r || `requirement_${idx}`;
      initial[key] = '';
    });
    setApplyFormValues(initial);
    setShowApplyModal(true);
  };

  const handleApplyInputChange = (key: string, value: any) => {
    setApplyFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFileChange = async (key: string, file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadApi.uploadFile(file);
      // backend upload returns id/url — store returned object
      handleApplyInputChange(key, uploaded);
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const submitApplicationWithForm = async () => {
    if (!applyProgram || !user) return;
    // prevent double submits
    if (applyingProgramId === applyProgram.id) return;

    // Validate required file uploads (all keys except 'reason' and 'classification')
    const requiredKeys = Object.keys(applyFormValues).filter(k => k !== 'reason' && k !== 'classification');
    const missing = requiredKeys.filter(k => {
      const v = applyFormValues[k];
      if (!v) return true;
      if (typeof v === 'object' && (v.url || v.filename || v.id)) return false;
      return true;
    });

    if (missing.length > 0) {
      alert('Please upload all required documents before submitting: ' + missing.join(', '));
      return;
    }

    setApplyingProgramId(applyProgram.id);

    // Optimistically add a temporary application so the program becomes unavailable immediately
    const tempAppId = `temp-${applyProgram.id}-${Date.now()}`;
    const tempApp: any = {
      id: tempAppId,
      program: applyProgram.id,
      status: 'pending',
      created_at: new Date().toISOString(),
      form_data: applyFormValues
    };

    setApplications(prev => [tempApp, ...prev]);

    try {
      // include applicant credentials in formData for BHW review
      const applicantInfo = {
        user_id: user.id,
        first_name: user.first_name || user.firstName || '',
        last_name: user.last_name || user.lastName || '',
        contact_number: user.contact_number || user.contactNumber || '',
        address: user.address || ''
      };

      const created = await applicationsApi.create({
        programId: applyProgram.id,
        formData: { ...applyFormValues, applicantInfo }
      });

      // Replace temp application with created one
      setApplications(prev => prev.map(a => a.id === tempAppId ? created : a));

      // create a notification for the beneficiary (local)
      try {
        const note = await notificationsApi.create({
          user: user.id,
          title: 'Application Submitted',
          message: `Your application for ${applyProgram.name} has been submitted.`,
          type: 'info',
          related_application: created.id
        });

        setNotifications(prev => [note, ...(prev || [])]);
        setUnreadCount(prev => (prev || 0) + 1);
      } catch (noteErr) {
        console.warn('Failed to create notification:', noteErr);
      }

      setShowApplyModal(false);
      setApplyProgram(null);
      setApplyFormValues({});
      alert('Application submitted successfully');
    } catch (err: any) {
      console.error('Error applying to program:', err);
      // remove temp application on failure
      setApplications(prev => prev.filter(a => a.id !== tempAppId));
      alert('Failed to submit application: ' + (err.message || err));
    } finally {
      setApplyingProgramId(null);
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
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(unreadNotifications.map(n => notificationsApi.markAsRead(n.id)));

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      bhw_verified: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'BHW Verified' },
      mswdo_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      scheduled: { color: 'bg-indigo-100 text-indigo-800', icon: Calendar, text: 'Scheduled' },
      claimed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, text: 'Claimed' },
      denied: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Denied' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
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
      <nav className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">CBSGMS</h1>
                <p className="text-xs text-gray-500">Beneficiary Dashboard</p>
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
              <button onClick={() => setActiveTab('programs')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='programs'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <ClipboardList className="w-4 h-4 inline mr-2" /> Available Programs
              </button>
              <button onClick={() => setActiveTab('applications')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='applications'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4 inline mr-2" /> My Applications ({applications.length})
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`w-full text-left px-3 py-2 rounded-lg ${activeTab==='notifications'?'bg-blue-50 text-blue-700':'text-gray-700 hover:bg-gray-50'}`}>
                <Bell className="w-4 h-4 inline mr-2" /> Notifications {unreadCount>0 && (<span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>)}
              </button>
            </div>
          </aside>

          <div className="flex-1 p-6">
            {beneficiary && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Classification</h2>
                <p className="text-gray-600">
                  {beneficiary.classification === 'senior_citizen' && 'Senior Citizen'}
                  {beneficiary.classification === 'pwd' && 'Person with Disability (PWD)'}
                  {beneficiary.classification === 'solo_parent' && 'Solo Parent'}
                </p>
                {beneficiary.classification === 'pwd' && beneficiary.disability_type && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Registered Disability Type:</p>
                    <p className="text-blue-800 font-semibold mt-1">
                      {beneficiary.disability_type === 'physical' && 'Physical / Orthopedic / Mobility Disability'}
                      {beneficiary.disability_type === 'visual' && 'Visual Disability'}
                      {beneficiary.disability_type === 'hearing' && 'Hearing Disability'}
                      {beneficiary.disability_type === 'speech' && 'Speech / Communication Disability'}
                      {beneficiary.disability_type === 'intellectual' && 'Intellectual Disability'}
                      {beneficiary.disability_type === 'psychosocial' && 'Psychosocial / Mental Health Disability'}
                      {beneficiary.disability_type === 'autism' && 'Autism Spectrum Disorder (ASD)'}
                      {beneficiary.disability_type === 'chronic' && 'Chronic Illness'}
                      {beneficiary.disability_type === 'multiple' && 'Multiple Disabilities'}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      {beneficiary.disability_type === 'physical' && 'Eligible for assistive devices, medical assistance, livelihood support, and educational assistance programs.'}
                      {beneficiary.disability_type === 'visual' && 'Eligible for white cane assistance, visual aids, medical assistance, and educational support programs.'}
                      {beneficiary.disability_type === 'hearing' && 'Eligible for hearing aids, medical assistance, educational support, and skills training programs.'}
                      {beneficiary.disability_type === 'speech' && 'Eligible for therapy assistance, medical support, and educational programs.'}
                      {beneficiary.disability_type === 'intellectual' && 'Eligible for educational assistance, therapy support, and medical assistance programs.'}
                      {beneficiary.disability_type === 'psychosocial' && 'Eligible for psychiatric assistance, counseling, medical support, and educational programs.'}
                      {beneficiary.disability_type === 'autism' && 'Eligible for therapy assistance, educational support, medical assistance, and family support programs.'}
                      {beneficiary.disability_type === 'chronic' && 'Eligible for medical assistance, hospitalization support, medicine support, and PhilHealth assistance.'}
                      {beneficiary.disability_type === 'multiple' && 'Eligible for all PWD programs applicable to your specific disabilities.'}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-3">
                  Status: <span className="font-medium">{beneficiary.status}</span>
                </p>
              </div>
            )}

            {/* Main content area */}
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
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setProgramPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {/* Classification Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <select
                        value={selectedClassification}
                        onChange={(e) => { 
                          console.log('Selected classification:', e.target.value);
                          setSelectedClassification(e.target.value); 
                          setProgramPage(1); 
                        }}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">All Classifications</option>
                        {programs && programs.length > 0 && Array.from(new Set(programs
                          .map(p => String(p.classification || '').toLowerCase().trim())
                          .filter(Boolean))).map((classification) => {
                          const classificationLabels: Record<string, string> = {
                            senior_citizen: 'Senior Citizen',
                            pwd: 'Person with Disability (PWD)',
                            solo_parent: 'Solo Parent'
                          };
                          return (
                            <option key={classification} value={classification}>
                              {classificationLabels[classification as keyof typeof classificationLabels] || classification}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Programs List */}
                <div className="space-y-4">
                  {(() => {
                    // Filter programs by search term and classification
                    let filtered = programs.filter((program) => {
                      const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()));
                      
                      // Normalize classification for comparison
                      const programClassification = String(program.classification || '').toLowerCase().trim();
                      const matchesClassification = !selectedClassification || programClassification === selectedClassification;
                      
                      console.log('Program:', program.name, 'Classification:', programClassification, 'Selected:', selectedClassification, 'Match:', matchesClassification);
                      
                      return matchesSearch && matchesClassification;
                    });

                    // Sort by creation date (newest first)
                    filtered.sort((a, b) => {
                      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
                      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
                      return dateB - dateA;
                    });

                    // Pagination
                    const itemsPerPage = 2;
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    const start = (programPage - 1) * itemsPerPage;
                    const paginatedPrograms = filtered.slice(start, start + itemsPerPage);

                    return (
                      <>
                        {filtered.length === 0 ? (
                          <p className="text-gray-500 text-center py-12 text-lg">No programs match your search or filter</p>
                        ) : (
                          <>
                            {paginatedPrograms.map((program) => {
                              const eligibility = canApplyToProgram(program);
                              const programIdStr = String(program.id);
                              const hasPendingApp = applications.some(app => {
                                const appProgramId = app.program || app.program_id || app.programs?.id || app.programs?.program || (app.programs && app.programs.id);
                                return String(appProgramId) === programIdStr && ['pending', 'bhw_verified'].includes(app.status);
                              });

                              return (
                                <div key={program.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all hover:border-blue-300 bg-white">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                                      <p className="text-gray-600 mt-2">{program.description}</p>

                                      {program.classification && (
                                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded inline-block">
                                          <p className="text-xs font-medium text-blue-900">Classification: {program.classification}</p>
                                        </div>
                                      )}

                                      {program.requirements && (
                                        <div className="mt-4">
                                          <p className="text-sm font-medium text-gray-700">Requirements:</p>
                                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                            {(typeof program.requirements === 'string' ? program.requirements.split(',') : program.requirements).map((req: string, index: number) => (
                                              <li key={index}>{req.trim()}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleApplyNow(program)}
                                      disabled={!eligibility.canApply || String(applyingProgramId) === String(program.id) || hasPendingApp}
                                      className={`ml-4 px-6 py-2 rounded-lg transition-colors whitespace-nowrap ${String(applyingProgramId) === String(program.id) || hasPendingApp ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                      {String(applyingProgramId) === String(program.id) || hasPendingApp ? 'Pending...' : (eligibility.canApply ? 'Apply Now' : 'Not Eligible')}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="mt-8 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                  Page <span className="font-semibold">{programPage}</span> of <span className="font-semibold">{totalPages}</span> ({filtered.length} programs found)
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
                        placeholder="Search applications by program name..."
                        value={applicationSearch}
                        onChange={(e) => { setApplicationSearch(e.target.value); setApplicationPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {/* Status Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <select
                        value={applicationStatusFilter}
                        onChange={(e) => { setApplicationStatusFilter(e.target.value); setApplicationPage(1); }}
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
                      const programName = application.program_name || application.programs?.name || application.program?.name || 'Program';
                      const matchesSearch = programName.toLowerCase().includes(applicationSearch.toLowerCase());
                      const matchesStatus = !applicationStatusFilter || application.status === applicationStatusFilter;
                      return matchesSearch && matchesStatus;
                    });

                    // Pagination
                    const itemsPerPage = 2;
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    const start = (applicationPage - 1) * itemsPerPage;
                    const paginatedApplications = filtered.slice(start, start + itemsPerPage);

                    return (
                      <>
                        {filtered.length === 0 ? (
                          <p className="text-gray-500 text-center py-12 text-lg">You haven't applied to any programs yet</p>
                        ) : (
                          <>
                            {paginatedApplications.map((application: any) => {
                              const programObj = application.program || application.programs || application.program_data || null;
                              const programName = application.program_name || programObj?.name || programObj?.title || 'Program';
                              const programDescription = programObj?.description || application.program_description || '';
                              const programClassification = programObj?.classification || application.program_classification || '';
                              const programRequirements = programObj?.requirements || application.program_requirements || application.requirements || [];
                              const programMeta = {
                                is_one_time: programObj?.is_one_time ?? application.is_one_time,
                                waiting_period_days: programObj?.waiting_period_days ?? application.waiting_period_days
                              };

                              const appliedOn = application.created_at ? new Date(application.created_at).toLocaleDateString() : '';
                              const reason = application.form_data?.reason || application.formData?.reason || application.reason;
                              const applicantInfo = application.form_data?.applicantInfo || application.formData?.applicantInfo || application.applicantInfo;

                              return (
                                <div key={application.id} className="border border-gray-200 rounded-lg p-6">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{programName}</h3>
                                      <p className="text-sm text-gray-500 mt-1">Applied on {appliedOn}</p>
                                      {reason && <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Reason:</span> {reason}</p>}
                                      {applicantInfo && (
                                        <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Applicant:</span> {applicantInfo.first_name || applicantInfo.firstName || ''} {applicantInfo.last_name || applicantInfo.lastName || ''}</p>
                                      )}

                                      {/* Program details block */}
                                      <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded">
                                        {programDescription ? (
                                          <p className="text-sm text-gray-700">{programDescription}</p>
                                        ) : (
                                          <p className="text-sm text-gray-500">No program description available.</p>
                                        )}

                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {programClassification && (
                                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-800 rounded">Classification: {programClassification}</span>
                                          )}
                                          {programMeta.is_one_time && (
                                            <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-800 rounded">One-time</span>
                                          )}
                                          {programMeta.waiting_period_days > 0 && (
                                            <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-800 rounded">Wait: {programMeta.waiting_period_days}d</span>
                                          )}
                                        </div>

                                        {Array.isArray(programRequirements) && programRequirements.length > 0 && (
                                          <div className="mt-3 text-sm">
                                            <p className="font-medium text-gray-700">Requirements:</p>
                                            <ul className="list-disc list-inside text-gray-600 mt-1">
                                              {programRequirements.map((r: any, idx: number) => (
                                                <li key={idx}>{typeof r === 'string' ? r : r?.label || r?.name || JSON.stringify(r)}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {getStatusBadge(application.status)}
                                  </div>

                                  {application.bhw_notes && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                      <p className="text-sm font-medium text-blue-900">BHW Notes:</p>
                                      <p className="text-sm text-blue-700">{application.bhw_notes}</p>
                                    </div>
                                  )}

                                  {application.mswdo_notes && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                                      <p className="text-sm font-medium text-green-900">MSWDO Notes:</p>
                                      <p className="text-sm text-green-700">{application.mswdo_notes}</p>
                                    </div>
                                  )}

                                  {application.denial_reason && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                                      <p className="text-sm font-medium text-red-900">Denial Reason:</p>
                                      <p className="text-sm text-red-700">{application.denial_reason}</p>
                                    </div>
                                  )}

                                  {application.release_schedules && application.release_schedules.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-3">
                                      <div className="flex items-center mb-2">
                                        <Calendar className="w-5 h-5 text-blue-700 mr-2" />
                                        <h4 className="font-semibold text-blue-900">Release Schedule</h4>
                                      </div>
                                      <div className="space-y-1 text-sm">
                                        <p className="text-blue-800">
                                          <span className="font-medium">Date:</span>{' '}
                                          {new Date(application.release_schedules[0].release_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </p>
                                        {application.release_schedules[0].release_time && (
                                          <p className="text-blue-800">
                                            <span className="font-medium">Time:</span>{' '}
                                            {application.release_schedules[0].release_time}
                                          </p>
                                        )}
                                        <p className="text-blue-800">
                                          <span className="font-medium">Venue:</span>{' '}
                                          {application.release_schedules[0].venue}
                                        </p>
                                        {application.release_schedules[0].instructions && (
                                          <p className="text-blue-800 mt-2">
                                            <span className="font-medium">Instructions:</span><br/>
                                            {application.release_schedules[0].instructions}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="border-t pt-4 mt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</p>
                                    {(() => {
                                      const formDocs: any[] = [];
                                      if (application.form_data) {
                                        Object.entries(application.form_data).forEach(([key, value]: [string, any]) => {
                                          if (value && typeof value === 'object' && value.url && !Array.isArray(value)) {
                                            formDocs.push({ name: key, ...value });
                                          }
                                        });
                                      }
                                      
                                      const hasDocuments = (application.application_documents && application.application_documents.length > 0) || formDocs.length > 0;
                                      
                                      return hasDocuments ? (
                                        <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                                          {application.application_documents && application.application_documents.map((doc: any) => (
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
                                        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                                          <p className="text-sm text-gray-500">No documents uploaded for this application</p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="mt-8 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                  Page <span className="font-semibold">{applicationPage}</span> of <span className="font-semibold">{totalPages}</span> ({filtered.length} applications found)
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setApplicationPage(p => Math.max(1, p - 1))}
                                    disabled={applicationPage === 1}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                  </button>
                                  <button
                                    onClick={() => setApplicationPage(p => Math.min(totalPages, p + 1))}
                                    disabled={applicationPage === totalPages}
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

            {activeTab === 'notifications' && (
              <div>
                {/* Filter Bar */}
                <div className="mb-6 flex justify-end">
                  <div className="relative max-w-xs">
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

                    // Pagination
                    const itemsPerPage = 4;
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
          {showApplyModal && applyProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Apply for {applyProgram.name}</h3>
                    <button onClick={() => { setShowApplyModal(false); setApplyProgram(null); setApplyFormValues({}); }} className="text-gray-600 hover:text-gray-800">Close</button>
                  </div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gray-700 mb-4">Please provide the required information and upload any necessary documents below.</p>
                    <div className="space-y-4">
                      <div className="border rounded p-3">
                        <p className="text-sm font-medium text-gray-700">Applicant</p>
                        <p className="text-sm text-gray-900">{beneficiary?.user?.first_name || user?.first_name} {beneficiary?.user?.last_name || user?.last_name}</p>
                          {beneficiary?.classification && (
                            <p className="text-xs text-gray-600">Classification: {beneficiary.classification}</p>
                          )}
                      </div>

                      <div className="border rounded p-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Applying</label>
                        <textarea
                          value={applyFormValues['reason'] || ''}
                          onChange={(e) => handleApplyInputChange('reason', e.target.value)}
                          className="w-full border rounded p-2 text-sm"
                          rows={3}
                          placeholder="Explain why you are applying for this program"
                        />
                      </div>

                      {Object.keys(applyFormValues).filter(k => k !== 'reason' && k !== 'classification').length === 0 && (
                        <p className="text-gray-500">No additional requirements listed for this program.</p>
                      )}
                      {Object.keys(applyFormValues).filter(k => k !== 'reason' && k !== 'classification').map((key) => {
                        const value = applyFormValues[key];
                        return (
                          <div key={key} className="border rounded p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">{key}</label>
                            <p className="text-sm text-gray-500 mb-2">Please upload the required document for <span className="font-medium">{key}</span>.</p>
                            <div className="mt-2">
                              <input
                                type="file"
                                onChange={(e: any) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleApplyFileChange(key, f);
                                }}
                              />
                              {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                              {value && typeof value === 'object' && (value.url || value.filename || value.id) && (
                                <p className="text-xs text-gray-600 mt-2">Uploaded: {value.url || value.filename || value.id}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <button onClick={() => { setShowApplyModal(false); setApplyProgram(null); setApplyFormValues({}); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button onClick={submitApplicationWithForm} disabled={applyingProgramId === applyProgram.id || uploading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">Submit Application</button>
                  </div>
                </div>
              </div>
            )}
      </div>
    </div>
  );
}
