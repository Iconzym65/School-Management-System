import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Clock,
  Video,
  Award,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Lock,
  ExternalLink,
  RefreshCw,
  Search,
  Check,
  Send,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

// --- API Client Helper ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = resJson.message || resJson.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

export const StudentPortalDashboard = () => {
  // --- Navigation & UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // --- Real-Time Student Database State ---
  const [studentProfile, setStudentProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradesSummary, setGradesSummary] = useState([]);

  // --- Modal & Submission States ---
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    submission_text: '',
    attachment_url: '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });

  const [assignmentFilter, setAssignmentFilter] = useState('all');

  const showToast = (message, type = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Load Student Data ---
  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, coursesRes, timetableRes, assignmentsRes, attendanceRes, gradesRes] = await Promise.allSettled([
        apiFetch('/student/profile'),
        apiFetch('/student/courses'),
        apiFetch('/student/timetable'),
        apiFetch('/student/assignments'),
        apiFetch('/student/attendance'),
        apiFetch('/student/grades')
      ]);

      if (profileRes.status === 'fulfilled') setStudentProfile(profileRes.value?.user || profileRes.value);
      if (coursesRes.status === 'fulfilled') setEnrolledCourses(Array.isArray(coursesRes.value) ? coursesRes.value : []);
      if (timetableRes.status === 'fulfilled') setTimetableSlots(Array.isArray(timetableRes.value) ? timetableRes.value : []);
      if (assignmentsRes.status === 'fulfilled') setAssignments(Array.isArray(assignmentsRes.value) ? assignmentsRes.value : []);
      if (attendanceRes.status === 'fulfilled') setAttendanceRecords(Array.isArray(attendanceRes.value) ? attendanceRes.value : []);
      if (gradesRes.status === 'fulfilled') setGradesSummary(Array.isArray(gradesRes.value) ? gradesRes.value : []);

    } catch (err) {
      showToast(err.message || 'Failed to synchronize student portal records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // Payment Firewall Verification Check
  const isAccountActive = studentProfile?.status === 'ACTIVE';

  // Computed Values
  const pendingAssignmentsCount = assignments.filter((a) => !a.submitted).length;
  const gradedAssignments = assignments.filter((a) => a.grade !== null && a.grade !== undefined);
  const averageGrade = gradedAssignments.length > 0
    ? (gradedAssignments.reduce((acc, curr) => acc + Number(curr.grade), 0) / gradedAssignments.length).toFixed(1)
    : 'N/A';

  const attendanceRate = attendanceRecords.length > 0
    ? ((attendanceRecords.filter((r) => r.status === 'present').length / attendanceRecords.length) * 100).toFixed(0)
    : '100';

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (assignmentFilter === 'pending') return !a.submitted;
      if (assignmentFilter === 'submitted') return a.submitted && a.grade === null;
      if (assignmentFilter === 'graded') return a.grade !== null;
      return true;
    });
  }, [assignments, assignmentFilter]);

  // --- Handlers ---
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/student/assignments/${selectedAssignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionForm)
      });
      showToast(`Assignment "${selectedAssignment.title}" submitted successfully!`, 'success');
      setSelectedAssignment(null);
      setSubmissionForm({ submission_text: '', attachment_url: '' });
      loadStudentData();
    } catch (err) {
      showToast(err.message || 'Failed to submit assignment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordForm)
      });
      showToast('Password updated successfully!', 'success');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* ======================================================== */}
      {/* TOP NAVBAR */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard' ? 'Student Workspace' : activeTab.replace('-', ' ')}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {studentProfile?.cohort?.name || 'Vacation Session'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Payment Firewall Status Badge */}
          <div className="hidden sm:flex items-center">
            {isAccountActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tuition Paid (Live Access Active)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Payment Gated (Class Links Locked)</span>
              </span>
            )}
          </div>

          <button
            onClick={loadStudentData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-50"
            title="Refresh Records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {studentProfile?.name ? studentProfile.name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{studentProfile?.name || 'Student Name'}</p>
                <p className="text-[10px] font-mono text-slate-500">{studentProfile?.student_number || 'STU-Pending'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${studentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {studentDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{studentProfile?.name || 'Student'}</p>
                  <p className="text-xs font-mono text-slate-500">{studentProfile?.email || 'student@school.test'}</p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${isAccountActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isAccountActive ? 'Account Unlocked' : 'Tuition Pending'}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setStudentDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setStudentDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Change Password</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside
          className={`bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              S
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-wide">StudentDesk</h1>
                <p className="text-[10px] text-slate-400 font-mono">Academic Portal</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('timetable')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'timetable' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              {sidebarOpen && <span>Classes & Live Links</span>}
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'courses' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              {sidebarOpen && <span>My Courses ({enrolledCourses.length})</span>}
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              {sidebarOpen && <span>Assignments ({pendingAssignmentsCount} Due)</span>}
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'grades' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              {sidebarOpen && <span>Grades & Performance</span>}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
              {sidebarOpen && <span>My Attendance Logs</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <User className="w-4 h-4 text-purple-400 shrink-0" />
              {sidebarOpen && <span>Student Profile</span>}
            </button>
          </nav>
        </aside>

        {/* VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Toast Notification */}
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                  : 'bg-rose-900 text-rose-50 border-rose-700'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-xs text-white/70 hover:text-white font-bold ml-2">✕</button>
            </div>
          )}

          {/* Payment Gating Warning Banner (If Gated)[cite: 2] */}
          {!isAccountActive && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-900">Tuition Payment Pending - Live Access Gated</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your account has payment-gated restrictions. Virtual class meeting links (Zoom/Meet) will remain hidden until clearance is confirmed[cite: 2].
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. DASHBOARD OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Enrolled Courses</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{enrolledCourses.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Pending Assignments</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{pendingAssignmentsCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Average Score</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{averageGrade}%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Attendance Rate</p>
                  <p className="text-2xl font-black text-teal-600 mt-1">{attendanceRate}%</p>
                </div>
              </div>

              {/* Quick Actions & Next Class Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>Weekly Schedule & Live Classes</span>[cite: 2]
                    </h2>
                    <button
                      onClick={() => setActiveTab('timetable')}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View Full Timetable[cite: 2]
                    </button>
                  </div>

                  <div className="space-y-3">
                    {timetableSlots.slice(0, 3).map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {slot.course_code || slot.course?.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{slot.course_title || slot.course?.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {slot.day_of_week} • {slot.start_time} - {slot.end_time} • Lecturer: {slot.teacher_name || slot.teacher?.name}[cite: 2]
                          </p>
                        </div>

                        {/* Payment Gated Link Control[cite: 2] */}
                        {isAccountActive ? (
                          <a
                            href={slot.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                          >
                            <Video className="w-4 h-4" />
                            <span>Join Live Class</span>[cite: 2]
                          </a>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed shrink-0"
                            title="Payment required to view link[cite: 2]"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Link Locked</span>[cite: 2]
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deadlines Sidebar */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <span>Upcoming Deadlines</span>[cite: 2]
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {assignments.filter((a) => !a.submitted).slice(0, 4).map((item) => (
                      <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-blue-700">{item.course_code}</span>
                          <span className="text-[10px] font-mono text-rose-600 font-bold">Due: {item.due_date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>[cite: 2]
                        <button
                          onClick={() => {
                            setSelectedAssignment(item);
                            setActiveTab('assignments');
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:underline inline-block"
                        >
                          Submit Now →
                        </button>[cite: 2]
                      </div>
                    ))}
                    {pendingAssignmentsCount === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">No pending assignments!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. TIMETABLE & VIRTUAL LINKS VIEW */}
          {/* ======================================================== */}
          {activeTab === 'timetable' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Weekly Schedule & Virtual Classrooms</h2>[cite: 2]
                  <p className="text-xs text-slate-500">Access your scheduled Zoom or Google Meet sessions.</p>[cite: 2]
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetableSlots.map((slot) => {
                  return (
                    <div
                      key={slot.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {slot.course_code || slot.course?.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {slot.virtual_platform || 'Live Video'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-2">{slot.course_title || slot.course?.title}</h4>[cite: 2]
                        <p className="text-xs text-slate-600 mt-1">Lecturer: {slot.teacher_name || slot.teacher?.name}</p>[cite: 2]

                        <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                          <p className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" /> {slot.day_of_week}[cite: 2]
                          </p>
                          <p className="flex items-center gap-1.5 font-mono text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-600" /> {slot.start_time} - {slot.end_time}[cite: 2]
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200">
                        {isAccountActive ? (
                          <a
                            href={slot.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                          >
                            <Video className="w-4 h-4" />
                            <span>Launch Live Class</span>[cite: 2]
                          </a>
                        ) : (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] text-center font-bold flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked (Pending Payment)</span>[cite: 2]
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 3. MY COURSES VIEW */}
          {/* ======================================================== */}
          {activeTab === 'courses' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Enrolled Vacation Courses</h2>
                <p className="text-xs text-slate-500">Curricula and assigned faculty for your current session.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {course.credit_hours} Credits
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {course.description || 'No description provided.'}
                      </p>
                      <p className="text-xs font-semibold text-blue-600 mt-3">
                        Lecturer: {course.teacher?.name || 'Assigned Staff'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 4. ASSIGNMENTS & SUBMISSIONS VIEW */}
          {/* ======================================================== */}
          {activeTab === 'assignments' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assignments & Project Submissions</h2>[cite: 2]
                  <p className="text-xs text-slate-500">View tasks from your lecturers and submit your work.</p>[cite: 2]
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${assignmentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    All ({assignments.length})
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${assignmentFilter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    Pending ({pendingAssignmentsCount})
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('graded')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${assignmentFilter === 'graded' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    Graded ({gradedAssignments.length})[cite: 2]
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Assignment</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Grade / Score</th>[cite: 2]
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAssignments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.course_code}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{item.title}</p>[cite: 2]
                          <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                        </td>
                        <td className="py-3 px-4 font-mono">{item.due_date}</td>
                        <td className="py-3 px-4">
                          {item.submitted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.grade !== null && item.grade !== undefined ? (
                            <span className="text-emerald-700">{item.grade}%</span>
                          ) : (
                            <span className="text-slate-400 italic">Ungraded</span>
                          )}[cite: 2]
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAssignment(item)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                          >
                            {item.submitted ? 'Resubmit / View' : 'Submit Work'}
                          </button>[cite: 2]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 5. GRADES & TRANSCRIPT VIEW */}
          {/* ======================================================== */}
          {activeTab === 'grades' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Academic Grades & Performance</h2>[cite: 2]
                  <p className="text-xs text-slate-500">Official marks released by course instructors.</p>[cite: 2]
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Overall Average</p>
                  <p className="text-xl font-black text-emerald-900">{averageGrade}%</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Assessment / Task</th>
                      <th className="py-3 px-4">Lecturer</th>
                      <th className="py-3 px-4">Score</th>[cite: 2]
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {assignments.filter((a) => a.grade !== null).map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.course_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.title}</td>[cite: 2]
                        <td className="py-3 px-4">{item.teacher_name || 'Instructor'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">{item.grade}%</td>[cite: 2]
                        <td className="py-3 px-4 text-slate-600 italic">{item.feedback || 'Satisfactory work completed.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 6. MY ATTENDANCE LOGS VIEW */}
          {/* ======================================================== */}
          {activeTab === 'attendance' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Personal Attendance Record</h2>
                <p className="text-xs text-slate-500">Live attendance status verified by lecturers per session.</p>[cite: 2, 3]
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Marked By</th>[cite: 3]
                      <th className="py-3 px-4">Notes</th>[cite: 3]
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {attendanceRecords.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 px-4 font-mono font-bold">{log.session_date}</td>[cite: 3]
                        <td className="py-3 px-4 font-mono">{log.course_code}</td>[cite: 3]
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>[cite: 3]
                        </td>
                        <td className="py-3 px-4">{log.marked_by}</td>[cite: 3]
                        <td className="py-3 px-4 text-slate-500 italic">{log.notes}</td>[cite: 3]
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 7. PROFILE & SECURITY VIEW */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-2xl">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Student Profile & Credentials</h2>
                <p className="text-xs text-slate-500">Manage your portal access and verify assigned batch.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input type="text" readOnly value={studentProfile?.name || ''} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input type="email" readOnly value={studentProfile?.email || ''} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Student Index Number</label>
                  <input type="text" readOnly value={studentProfile?.student_number || 'STU-Auto'} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-blue-700" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vacation Cohort Batch</label>
                  <input type="text" readOnly value={studentProfile?.cohort?.name || '2026 Vacation Intake'} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Change Password
                </button>[cite: 2]
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: SUBMIT ASSIGNMENT */}
      {/* ======================================================== */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedAssignment.course_code}</span>
                <h3 className="text-base font-bold text-slate-900">{selectedAssignment.title}</h3>[cite: 2]
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Written Response / Explanation</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your submission, solutions, or explanation..."
                  value={submissionForm.submission_text}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, submission_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Attachment / Project URL (Google Drive, GitHub, etc.)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={submissionForm.attachment_url}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, attachment_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedAssignment(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Confirm Submission'}</span>
                </button>[cite: 2]
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHANGE PASSWORD */}
      {/* ======================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Change Password</h3>[cite: 2]
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                  Update Password
                </button>[cite: 2]
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- DOM Mount ---
const studentRoot = document.getElementById('student-portal-root');
if (studentRoot) {
  ReactDOM.createRoot(studentRoot).render(
    <React.StrictMode>
      <StudentPortalDashboard />
    </React.StrictMode>
  );
}

export default StudentPortalDashboard;