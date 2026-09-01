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
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Send,
  Save,
  Users,
  Check,
  X,
  RefreshCw,
  Eye,
  CheckSquare
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

export const TeacherPortalDashboard = () => {
  // --- Layout & UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // --- Real-Time Database State ---
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendanceRoster, setAttendanceRoster] = useState([]);

  // --- Attendance Marker Filter States ---
  const [selectedAttendanceCourse, setSelectedAttendanceCourse] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Modals & Drawer States ---
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    max_score: 100
  });

  const [gradingTarget, setGradingTarget] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Central Data Fetcher ---
  const loadTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, coursesRes, timetableRes, assignmentsRes, submissionsRes] = await Promise.allSettled([
        apiFetch('/teacher/profile'),
        apiFetch('/teacher/courses'),
        apiFetch('/teacher/timetable'),
        apiFetch('/teacher/assignments'),
        apiFetch('/teacher/submissions')
      ]);

      if (profileRes.status === 'fulfilled') setTeacherProfile(profileRes.value?.user || profileRes.value);
      if (coursesRes.status === 'fulfilled') {
        const courseData = Array.isArray(coursesRes.value) ? coursesRes.value : [];
        setCourses(courseData);
        if (courseData.length > 0 && !selectedAttendanceCourse) {
          setSelectedAttendanceCourse(courseData[0].id.toString());
        }
      }
      if (timetableRes.status === 'fulfilled') setTimetableSlots(Array.isArray(timetableRes.value) ? timetableRes.value : []);
      if (assignmentsRes.status === 'fulfilled') setAssignments(Array.isArray(assignmentsRes.value) ? assignmentsRes.value : []);
      if (submissionsRes.status === 'fulfilled') setSubmissions(Array.isArray(submissionsRes.value) ? submissionsRes.value : []);

    } catch (err) {
      showToast(err.message || 'Failed to synchronize faculty portal data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAttendanceCourse]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  // Load attendance roster when course or date changes
  const fetchAttendanceRoster = useCallback(async () => {
    if (!selectedAttendanceCourse) return;
    try {
      const res = await apiFetch(`/teacher/attendance?course_id=${selectedAttendanceCourse}&date=${attendanceDate}`);
      setAttendanceRoster(Array.isArray(res) ? res : []);
    } catch (_) {
      // Fallback empty roster
      setAttendanceRoster([]);
    }
  }, [selectedAttendanceCourse, attendanceDate]);

  useEffect(() => {
    if (activeTab === 'attendance' && selectedAttendanceCourse) {
      fetchAttendanceRoster();
    }
  }, [activeTab, selectedAttendanceCourse, attendanceDate, fetchAttendanceRoster]);

  // Computed Metrics
  const totalEnrolledStudents = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c.enrolled_students_count || c.students_count || 0), 0);
  }, [courses]);

  const pendingGradingCount = useMemo(() => {
    return submissions.filter((s) => s.grade === null || s.grade === undefined).length;
  }, [submissions]);

  // --- Handlers ---
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/teacher/assignments', {
        method: 'POST',
        body: JSON.stringify({
          course_id: parseInt(assignmentForm.course_id, 10),
          title: assignmentForm.title,
          description: assignmentForm.description,
          due_date: assignmentForm.due_date,
          max_score: Number(assignmentForm.max_score)
        })
      });
      showToast(`Assignment "${assignmentForm.title}" published!`, 'success');
      setShowCreateAssignmentModal(false);
      setAssignmentForm({ course_id: courses[0]?.id || '', title: '', description: '', due_date: '', max_score: 100 });
      loadTeacherData();
    } catch (err) {
      showToast(err.message || 'Failed to publish assignment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingTarget) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/teacher/submissions/${gradingTarget.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: Number(gradeForm.score),
          feedback: gradeForm.feedback
        })
      });
      showToast('Grade and feedback saved successfully!', 'success');
      setGradingTarget(null);
      setGradeForm({ score: '', feedback: '' });
      loadTeacherData();
    } catch (err) {
      showToast(err.message || 'Failed to submit grade', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAttendanceStatus = (studentId, status) => {
    setAttendanceRoster((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, status } : item))
    );
  };

  const handleUpdateAttendanceNotes = (studentId, notes) => {
    setAttendanceRoster((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, notes } : item))
    );
  };

  const handleSaveAttendanceRoster = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch('/teacher/attendance/batch', {
        method: 'POST',
        body: JSON.stringify({
          course_id: parseInt(selectedAttendanceCourse, 10),
          session_date: attendanceDate,
          records: attendanceRoster.map((r) => ({
            student_id: r.student_id,
            status: r.status || 'present',
            notes: r.notes || ''
          }))
        })
      });
      showToast('Attendance register successfully saved!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save attendance roster', 'error');
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
      {/* TOP HEADER */}
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
              {activeTab === 'dashboard' ? 'Faculty Command Desk' : activeTab.replace('-', ' ')}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Lecturer Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTeacherData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-50"
            title="Sync Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {teacherProfile?.name ? teacherProfile.name.slice(0, 2).toUpperCase() : 'TC'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{teacherProfile?.name || 'Faculty Member'}</p>
                <p className="text-[10px] font-mono text-slate-500">ID: {teacherProfile?.employee_id || 'STF-Auto'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{teacherProfile?.name || 'Instructor'}</p>
                  <p className="text-xs font-mono text-slate-500">{teacherProfile?.email || 'teacher@school.edu'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setDropdownOpen(false);
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
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              L
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-wide">FacultyDesk</h1>
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
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'courses' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              {sidebarOpen && <span>Assigned Courses ({courses.length})</span>}
            </button>

            <button
              onClick={() => setActiveTab('timetable')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'timetable' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              {sidebarOpen && <span>Virtual Classes & Join Links</span>}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
              {sidebarOpen && <span>Mark Attendance</span>}
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              {sidebarOpen && <span>Assignments & Tasks</span>}
            </button>

            <button
              onClick={() => setActiveTab('grading')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'grading' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              {sidebarOpen && <span>Grading & Submissions ({pendingGradingCount})</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <User className="w-4 h-4 text-purple-400 shrink-0" />
              {sidebarOpen && <span>Faculty Profile</span>}
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

          {/* ======================================================== */}
          {/* 1. DASHBOARD TAB */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">My Assigned Courses</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{courses.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Enrolled Students</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">{totalEnrolledStudents}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Pending Submissions</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{pendingGradingCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Weekly Sessions</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{timetableSlots.length}</p>
                </div>
              </div>

              {/* Quick Actions & Live Classes Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>Weekly Schedule & Host Links</span>
                    </h2>
                    <button onClick={() => setActiveTab('timetable')} className="text-xs font-bold text-blue-600 hover:underline">
                      Full Schedule →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {timetableSlots.map((slot) => (
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
                            {slot.day_of_week} • {slot.start_time} - {slot.end_time} • Room: {slot.classroom || 'Virtual Studio'}
                          </p>
                        </div>
                        <a
                          href={slot.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
                        >
                          <Video className="w-4 h-4 text-rose-400" />
                          <span>Start / Host Session</span>
                        </a>
                      </div>
                    ))}
                    {timetableSlots.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">No scheduled teaching slots assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Quick Task Actions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h2 className="font-bold text-base text-slate-900">Faculty Actions</h2>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setAssignmentForm({
                          course_id: courses[0]?.id || '',
                          title: '',
                          description: '',
                          due_date: '',
                          max_score: 100
                        });
                        setShowCreateAssignmentModal(true);
                      }}
                      className="w-full p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-left flex items-center gap-3 transition-all"
                    >
                      <Plus className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Publish New Assignment</p>
                        <p className="text-[11px] text-blue-700">Set deadlines and task prompts</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="w-full p-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-left flex items-center gap-3 transition-all"
                    >
                      <CheckSquare className="w-5 h-5 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Take Daily Attendance</p>
                        <p className="text-[11px] text-teal-700">Mark rosters for your lecture</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('grading')}
                      className="w-full p-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-left flex items-center gap-3 transition-all"
                    >
                      <Award className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Grade Submissions</p>
                        <p className="text-[11px] text-amber-700">{pendingGradingCount} awaiting evaluation</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. ASSIGNED COURSES TAB */}
          {/* ======================================================== */}
          {activeTab === 'courses' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">My Instructional Courses</h2>
                <p className="text-xs text-slate-500">Curricula and cohorts under your teaching allocation.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {course.cohort?.code || 'Vacation Intake'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {course.description || 'No course overview provided.'}
                      </p>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span>{course.credit_hours} Credit Hours</span>
                        <span className="font-bold text-blue-600">{course.enrolled_students_count || 0} Students</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 3. TIMETABLE & VIRTUAL LINKS TAB */}
          {/* ======================================================== */}
          {activeTab === 'timetable' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Teaching Timetable & Live Links</h2>
                <p className="text-xs text-slate-500">Launch and host your scheduled online classes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetableSlots.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {slot.course_code || slot.course?.code}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {slot.virtual_platform || 'Zoom Meeting'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{slot.course_title || slot.course?.title}</h4>

                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <p className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" /> {slot.day_of_week}
                        </p>
                        <p className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> {slot.start_time} - {slot.end_time}
                        </p>
                      </div>

                      <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-blue-600 truncate">
                        <a href={slot.meeting_link} target="_blank" rel="noreferrer">{slot.meeting_link}</a>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <a
                        href={slot.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                      >
                        <Video className="w-4 h-4 text-rose-400" />
                        <span>Launch & Host Classroom</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 4. MARK ATTENDANCE TAB */}
          {/* ======================================================== */}
          {activeTab === 'attendance' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Attendance Roster</h2>
                  <p className="text-xs text-slate-500">Record and update student attendance status for your lectures.</p>
                </div>
                <button
                  onClick={handleSaveAttendanceRoster}
                  disabled={isSubmitting || attendanceRoster.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Attendance Register'}</span>
                </button>
              </div>

              {/* Selector Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Select Course</label>
                  <select
                    value={selectedAttendanceCourse}
                    onChange={(e) => setSelectedAttendanceCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-1/2">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Index No.</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {attendanceRoster.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.student_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{row.student_number || 'STU-Auto'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {['present', 'absent', 'late', 'excused'].map((statusOption) => (
                              <button
                                key={statusOption}
                                onClick={() => handleToggleAttendanceStatus(row.student_id, statusOption)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                                  row.status === statusOption
                                    ? statusOption === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : statusOption === 'absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                {statusOption}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={row.notes || ''}
                            onChange={(e) => handleUpdateAttendanceNotes(row.student_id, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </td>
                      </tr>
                    ))}
                    {attendanceRoster.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No students enrolled in this course or no roster data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 5. ASSIGNMENTS & TASKS TAB */}
          {/* ======================================================== */}
          {activeTab === 'assignments' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course Assignments & Tasks</h2>
                  <p className="text-xs text-slate-500">Publish coursework, homework tasks, and term project guidelines.</p>
                </div>
                <button
                  onClick={() => {
                    setAssignmentForm({
                      course_id: courses[0]?.id || '',
                      title: '',
                      description: '',
                      due_date: '',
                      max_score: 100
                    });
                    setShowCreateAssignmentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Assignment</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((item) => (
                  <div key={item.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {item.course_code}
                        </span>
                        <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Due: {item.due_date}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-2">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span>Max Score: <strong>{item.max_score || 100}</strong></span>
                        <span className="font-bold text-indigo-600">{item.submissions_count || 0} Submissions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 6. GRADING & SUBMISSIONS TAB */}
          {/* ======================================================== */}
          {activeTab === 'grading' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Student Submissions & Grading Desk</h2>
                <p className="text-xs text-slate-500">Evaluate uploaded student responses, attach scores, and write feedback.</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Course & Assignment</th>
                      <th className="py-3 px-4">Submission Text / URL</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {submissions.map((sub) => {
                      const isGraded = sub.grade !== null && sub.grade !== undefined;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{sub.student_name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{sub.student_number || 'STU-Auto'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-blue-700">{sub.course_code}</p>
                            <p className="text-slate-800">{sub.assignment_title}</p>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="truncate text-slate-600">{sub.submission_text || 'No written response.'}</p>
                            {sub.attachment_url && (
                              <a
                                href={sub.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                              >
                                <span>Attachment</span> <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {isGraded ? (
                              <span className="text-emerald-700">{sub.grade}%</span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setGradingTarget(sub);
                                setGradeForm({ score: sub.grade || '', feedback: sub.feedback || '' });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                            >
                              {isGraded ? 'Update Grade' : 'Score Submission'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">No student submissions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* 7. PROFILE & CREDENTIALS TAB */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-2xl">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Faculty Staff Profile</h2>
                <p className="text-xs text-slate-500">Review your institutional credentials and update account security.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input type="text" readOnly value={teacherProfile?.name || ''} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input type="email" readOnly value={teacherProfile?.email || ''} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Faculty Staff ID</label>
                  <input type="text" readOnly value={teacherProfile?.employee_id || 'STF-Auto'} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-blue-700" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input type="text" readOnly value={teacherProfile?.phone || 'Not provided'} className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Change Password
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE ASSIGNMENT */}
      {/* ======================================================== */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Publish New Assignment</h3>
              <button onClick={() => setShowCreateAssignmentModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Course</label>
                <select
                  required
                  value={assignmentForm.course_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Select Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 2: Binary Search Tree Engine"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide assignment guidelines or problem sets..."
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Score</label>
                  <input
                    type="number"
                    required
                    value={assignmentForm.max_score}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateAssignmentModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: GRADE SUBMISSION */}
      {/* ======================================================== */}
      {gradingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs font-mono font-bold text-blue-600">{gradingTarget.course_code}</p>
                <h3 className="text-base font-bold text-slate-900">Grade: {gradingTarget.student_name}</h3>
              </div>
              <button onClick={() => setGradingTarget(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800">Student Response:</p>
              <p className="text-slate-600 italic whitespace-pre-wrap">{gradingTarget.submission_text || 'No written text.'}</p>
              {gradingTarget.attachment_url && (
                <div className="pt-2">
                  <a
                    href={gradingTarget.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>Open Submitted Project / Link</span> <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Score (0 - 100)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  placeholder="e.g. 88"
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Feedback / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Write constructive notes for the student..."
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setGradingTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Grade'}
                </button>
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
              <h3 className="text-base font-bold text-slate-900">Change Password</h3>
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
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- DOM Mount ---
const teacherRoot = document.getElementById('teacher-portal-root');
if (teacherRoot) {
  ReactDOM.createRoot(teacherRoot).render(
    <React.StrictMode>
      <TeacherPortalDashboard />
    </React.StrictMode>
  );
}

export default TeacherPortalDashboard;