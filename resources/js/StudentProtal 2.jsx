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
  Lock,
  RefreshCw,
  Send,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
  GraduationCap,
  Download,
  Sparkles,
  Phone,
  Mail,
  Hash,
  UploadCloud,
  FileUp,
  ExternalLink,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { validatePortalAccess, clearAuth } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Normalizes arrays, paginated responses, and API resource wrappers
const unwrapList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

// Formats live meeting links
const formatExternalUrl = (url) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Universal API Fetch Helper with automatic multipart FormData detection
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  const isFormData = options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      window.location.replace('/login');
    }
    const errorMessage = resJson.message || resJson.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

// Authenticated Stream Downloader with Sanctum Bearer Token Injection
const downloadAuthenticatedFile = async (url, fallbackName = 'assignment_brief.docx') => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    const disposition = response.headers.get('content-disposition');
    let filename = fallbackName;
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/["']/g, '').trim();
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert(err.message || 'Unable to download file. Please verify login.');
  }
};

export const StudentPortalDashboard = () => {
  useEffect(() => {
    validatePortalAccess('student').catch(() => {});
  }, []);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // Theme Sync
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Cohort Selection
  const [selectedCohortId, setSelectedCohortId] = useState(localStorage.getItem('student_selected_cohort_id') || '');
  const [availableCohorts, setAvailableCohorts] = useState([]);

  // Data Stores
  const [studentProfile, setStudentProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradesSummary, setGradesSummary] = useState(null);

  // Modals and Forms
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    submission_text: '',
    attachment_url: '',
    file: null,
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary Data Fetcher
  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cohortQuery = selectedCohortId ? `?cohort_id=${selectedCohortId}` : '';

      let userProfile = null;
      try {
        const pRes = await apiFetch('/student/profile');
        userProfile = pRes?.user || pRes?.data?.user || pRes?.data || pRes;
      } catch (_) {
        const meRes = await apiFetch('/auth/me');
        userProfile = meRes?.user || meRes?.data?.user || meRes?.data || meRes;
      }
      setStudentProfile(userProfile);

      const userEnrollments = userProfile?.enrollments || [];
      const cohortsMap = new Map();
      if (userProfile?.cohort) {
        cohortsMap.set(userProfile.cohort.id, userProfile.cohort);
      }
      userEnrollments.forEach((e) => {
        if (e.course?.cohort) cohortsMap.set(e.course.cohort.id, e.course.cohort);
      });
      setAvailableCohorts(Array.from(cohortsMap.values()));

      if (!selectedCohortId && userProfile?.cohort_id) {
        setSelectedCohortId(String(userProfile.cohort_id));
      }

      let dashboardData = null;
      try {
        dashboardData = await apiFetch(`/student/dashboard${cohortQuery}`);
      } catch (_) {}

      const [coursesRes, timetableRes, assignmentsRes, attendanceRes, gradesRes] = await Promise.allSettled([
        apiFetch(`/student/courses${cohortQuery}`),
        apiFetch(`/student/timetable${cohortQuery}`),
        apiFetch(`/student/assignments${cohortQuery}`),
        apiFetch(`/student/attendance${cohortQuery}`),
        apiFetch(`/student/grades${cohortQuery}`)
      ]);

      if (coursesRes.status === 'fulfilled') {
        setEnrolledCourses(unwrapList(coursesRes.value));
      } else if (dashboardData?.courses) {
        setEnrolledCourses(unwrapList(dashboardData.courses));
      } else if (userEnrollments.length > 0) {
        setEnrolledCourses(userEnrollments.map((e) => e.course).filter(Boolean));
      }

      if (timetableRes.status === 'fulfilled') {
        setTimetableSlots(unwrapList(timetableRes.value));
      } else if (dashboardData?.today_schedule) {
        setTimetableSlots(unwrapList(dashboardData.today_schedule));
      }

      if (assignmentsRes.status === 'fulfilled') {
        setAssignments(unwrapList(assignmentsRes.value));
      } else if (dashboardData?.upcoming_deadlines) {
        setAssignments(unwrapList(dashboardData.upcoming_deadlines));
      }

      if (attendanceRes.status === 'fulfilled') {
        setAttendanceRecords(unwrapList(attendanceRes.value));
      }

      if (gradesRes.status === 'fulfilled') {
        setGradesSummary(gradesRes.value);
      }

    } catch (err) {
      showToast(err.message || 'Failed to synchronize student records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCohortId]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // Tuition Firewall Status
  const isAccountActive = useMemo(() => {
    if (!studentProfile || !studentProfile.status) return false;
    const raw = typeof studentProfile.status === 'object'
      ? (studentProfile.status.value || studentProfile.status.name || '')
      : String(studentProfile.status);
    return raw.toUpperCase() === 'ACTIVE';
  }, [studentProfile]);

  // Computed Metrics
  const pendingAssignmentsCount = useMemo(() => {
    return assignments.filter((a) => !a.submission).length;
  }, [assignments]);

  const totalAssignmentsCount = assignments.length;

  // Normalized Grades Engine
  const normalizedGradeCourses = useMemo(() => {
    let rawList = [];
    if (gradesSummary) {
      if (Array.isArray(gradesSummary)) rawList = gradesSummary;
      else if (Array.isArray(gradesSummary.courses)) rawList = gradesSummary.courses;
      else if (Array.isArray(gradesSummary.data?.courses)) rawList = gradesSummary.data.courses;
      else if (Array.isArray(gradesSummary.data)) rawList = gradesSummary.data;
    }

    if (rawList.length > 0) {
      return rawList.map((c) => ({
        course_id: c.course_id || c.id,
        title: c.title || c.course_title || c.name || 'Subject',
        code: c.code || c.course_code || 'SUB-GEN',
        teacher_name: c.teacher_name || c.teacher?.name || 'Assigned Tutor',
        percent: c.percent !== undefined && c.percent !== null ? c.percent : c.percentage !== undefined ? c.percentage : null,
        gpa_points: c.gpa_points !== undefined ? c.gpa_points : null,
      }));
    }

    if (enrolledCourses.length > 0) {
      return enrolledCourses.map((course) => {
        const courseAssignments = assignments.filter(
          (a) => (a.course_id && Number(a.course_id) === Number(course.id)) || 
                 (a.course?.id && Number(a.course?.id) === Number(course.id))
        );

        let totalEarned = 0;
        let totalPossible = 0;
        let hasGraded = false;

        courseAssignments.forEach((a) => {
          if (a.submission && a.submission.score !== null && a.submission.score !== undefined) {
            totalEarned += Number(a.submission.score);
            totalPossible += Number(a.max_score || 100);
            hasGraded = true;
          }
        });

        const percent = hasGraded && totalPossible > 0
          ? Math.round((totalEarned / totalPossible) * 100 * 10) / 10
          : null;

        let gpa = null;
        if (percent !== null) {
          if (percent >= 80) gpa = 4.0;
          else if (percent >= 70) gpa = 3.0;
          else if (percent >= 60) gpa = 2.0;
          else if (percent >= 50) gpa = 1.0;
          else gpa = 0.0;
        }

        return {
          course_id: course.id,
          title: course.title,
          code: course.code,
          teacher_name: course.teacher?.name || course.timetables?.[0]?.teacher?.name || 'Assigned Tutor',
          percent,
          gpa_points: gpa,
        };
      });
    }

    return [];
  }, [gradesSummary, enrolledCourses, assignments]);

  // Displays N/A when student has no marks instead of defaulting to 100%
  const averageGrade = useMemo(() => {
    if (gradesSummary?.average_percentage !== undefined && gradesSummary?.average_percentage !== null) {
      return typeof gradesSummary.average_percentage === 'number'
        ? `${gradesSummary.average_percentage.toFixed(1)}%`
        : String(gradesSummary.average_percentage);
    }
    const scoredCourses = normalizedGradeCourses.filter((c) => c.percent !== null && c.percent !== undefined);
    if (scoredCourses.length > 0) {
      const avg = scoredCourses.reduce((sum, c) => sum + Number(c.percent), 0) / scoredCourses.length;
      return `${avg.toFixed(1)}%`;
    }
    return 'N/A';
  }, [gradesSummary, normalizedGradeCourses]);

  // Displays N/A when no attendance sessions are recorded instead of defaulting to 100%
  const attendanceRate = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'N/A';
    const present = attendanceRecords.filter((r) => String(r.status).toUpperCase() === 'PRESENT').length;
    return `${((present / attendanceRecords.length) * 100).toFixed(0)}%`;
  }, [attendanceRecords]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const isSubmitted = Boolean(a.submission?.submitted_at);
      const isGraded = a.submission && a.submission.score !== null && a.submission.score !== undefined;
      if (assignmentFilter === 'pending') return !isSubmitted;
      if (assignmentFilter === 'submitted') return isSubmitted && !isGraded;
      if (assignmentFilter === 'graded') return isGraded;
      return true;
    });
  }, [assignments, assignmentFilter]);

  // Submission Handler (Supports File Upload via FormData)
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (submissionForm.submission_text) {
        formData.append('text_entry', submissionForm.submission_text);
      }
      if (submissionForm.attachment_url) {
        formData.append('attachment_url', submissionForm.attachment_url);
      }
      if (submissionForm.file) {
        formData.append('file', submissionForm.file);
      }

      await apiFetch(`/student/assignments/${selectedAssignment.id}/submit`, {
        method: 'POST',
        body: formData,
      });

      showToast(`Task "${selectedAssignment.title}" submitted successfully.`, 'success');
      setSelectedAssignment(null);
      setSubmissionForm({ submission_text: '', attachment_url: '', file: null });
      loadStudentData();
    } catch (err) {
      showToast(err.message || 'Failed to submit assignment.', 'error');
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
      showToast('Password updated successfully.', 'success');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {
    } finally {
      clearAuth();
      window.location.replace('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors duration-200">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight capitalize">
              {activeTab === 'dashboard' ? 'SHS Student Desk' : activeTab.replace('-', ' ')}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              {availableCohorts.find(c => String(c.id) === String(selectedCohortId))?.name || 'Vacation Session'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Operating Batch Selector */}
          {availableCohorts.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch:</span>
              <select
                value={selectedCohortId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCohortId(newId);
                  localStorage.setItem('student_selected_cohort_id', newId);
                }}
                className="bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                {availableCohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code || 'VAC'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Tuition Status Badge */}
          <div className="hidden sm:flex items-center">
            {isAccountActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tuition Verified</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Payment Gated</span>
              </span>
            )}
          </div>

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={loadStudentData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                {studentProfile?.name ? studentProfile.name.slice(0, 2).toUpperCase() : 'SH'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {studentProfile?.name || 'SHS Student'}
                </p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {studentProfile?.student_number || 'STU-Auto'}
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${studentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {studentDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{studentProfile?.name || 'Student'}</p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{studentProfile?.email || 'student@school.test'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('profile'); setStudentDropdownOpen(false); }}
                    className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(true); setStudentDropdownOpen(false); }}
                    className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Change Password</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Structural Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside
          className={`bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-black text-white tracking-wide">SHS Portal</h1>
                <p className="text-[10px] text-slate-400 font-mono">Vacation Classes</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveTab('timetable')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'timetable' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              {sidebarOpen && <span>Virtual Lessons &amp; Links</span>}
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              {sidebarOpen && <span>My Subjects ({enrolledCourses.length})</span>}
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'assignments' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                {sidebarOpen && <span>Exercises &amp; Tasks</span>}
              </div>
              {sidebarOpen && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {totalAssignmentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'grades' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              {sidebarOpen && <span>Academic Performance</span>}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
              {sidebarOpen && <span>My Attendance Logs</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4 text-purple-400 shrink-0" />
              {sidebarOpen && <span>Student Profile</span>}
            </button>
          </nav>
        </aside>

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Tuition Firewall Restriction Banner */}
          {!isAccountActive && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">Tuition Payment Pending — Live Virtual Access Restricted</h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Your registration is recorded, but virtual lecture coordinates remain locked until cleared by campus administration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Registered Subjects</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{enrolledCourses.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Tasks</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalAssignmentsCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Average Score</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{averageGrade}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Attendance Rate</p>
                  <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{attendanceRate}</p>
                </div>
              </div>

              {/* Schedule and Deadlines Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Today's Lesson Schedule</span>
                    </h3>
                    <button onClick={() => setActiveTab('timetable')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
                      Full Schedule →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {timetableSlots.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No live lectures scheduled for this batch today.</p>
                    ) : (
                      timetableSlots.slice(0, 3).map((slot) => (
                        <div
                          key={slot.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                {slot.course?.code || slot.course_code}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{slot.course?.title || slot.course_title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {slot.day_of_week} • {slot.start_time} - {slot.end_time} • Tutor: {slot.teacher_name || slot.teacher?.name || 'Assigned Tutor'}
                            </p>
                          </div>

                          {isAccountActive && slot.meeting_open ? (
                            <a
                              href={formatExternalUrl(slot.meeting_link)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Live Lesson</span>
                            </a>
                          ) : (
                            <div className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed shrink-0">
                              <Lock className="w-3.5 h-3.5" />
                              <span>{!isAccountActive ? 'Link Locked' : 'Opens at Scheduled Time'}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Upcoming Deadlines</span>
                  </h3>
                  <div className="space-y-3">
                    {assignments.filter((a) => !a.submission).slice(0, 4).map((item) => (
                      <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{item.course?.code || item.course_code}</span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">Due: {item.due_at?.slice(0, 10) || item.due_date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                        <button
                          onClick={() => {
                            setSelectedAssignment(item);
                            setActiveTab('assignments');
                          }}
                          className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-block cursor-pointer"
                        >
                          Submit Work →
                        </button>
                      </div>
                    ))}
                    {pendingAssignmentsCount === 0 && (
                      <p className="text-xs text-slate-500 italic py-4 text-center">All assigned exercises completed!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIRTUAL SCHEDULE */}
          {activeTab === 'timetable' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Lesson Timetable &amp; Virtual Classrooms</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled Zoom or Google Meet classroom delivery periods.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetableSlots.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{slot.course?.code || slot.course_code}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {slot.virtual_platform || 'Live Session'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{slot.course?.title || slot.course_title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tutor: {slot.teacher_name || slot.teacher?.name || 'Assigned Tutor'}</p>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300">
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {slot.day_of_week}</p>
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-600" /> {slot.start_time} - {slot.end_time}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      {isAccountActive && slot.meeting_open ? (
                        <a
                          href={formatExternalUrl(slot.meeting_link)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Launch Live Classroom</span>
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{!isAccountActive ? 'Locked (Pending Fee Clearance)' : 'Opens at Class Time'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 3: REGISTERED SUBJECTS */}
          {activeTab === 'courses' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Registered SHS Curriculum Subjects</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Academic modules and faculty mentors for this vacation term.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {course.credit_hours || 3} Credit Units
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {course.description || 'Comprehensive examination preparation and syllabus mastery.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Tutor: {course.teacher?.name || course.timetables?.[0]?.teacher?.name || 'Assigned Tutor'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: ASSIGNMENTS & TASKS (SIDE-BY-SIDE CARDS WITH ATTACHMENT BRIEF) */}
          {activeTab === 'assignments' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Assignments &amp; Problem Sets</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Inspect assignment briefs, download attached files, and submit completed coursework.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      assignmentFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({assignments.length})
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('pending')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      assignmentFilter === 'pending'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pending ({pendingAssignmentsCount})
                  </button>
                </div>
              </div>

              {/* Side-by-Side Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAssignments.map((item) => {
                  const isSubmitted = Boolean(item.submission?.submitted_at);
                  const isGraded = item.submission && item.submission.score !== null && item.submission.score !== undefined;
                  
                  // Resilient check across all possible backend attachment flags
                  const hasAttachment = Boolean(
                    item.has_prompt_attachment ||
                    item.attachment_path ||
                    item.has_attachment ||
                    item.attachment_url
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                            {item.course?.code || item.course_code || 'CRS'}
                          </span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                            Due: {item.due_at?.slice(0, 10) || item.due_date}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{item.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {item.instructions || item.description || 'Click View Details to inspect questions and assignment brief.'}
                          </p>
                        </div>

                        {/* Direct Download & View Prompt Actions */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingAssignment(item)}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Task Instructions</span>
                          </button>

                          {hasAttachment && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = item.attachment_url || `/api/v1/student/assignments/${item.id}/download`;
                                downloadAuthenticatedFile(url, `${item.title.replace(/\s+/g, '_')}_brief.docx`);
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Download Attached Brief</span>
                              <Download className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          {isGraded ? (
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Mark: {item.submission.score} / {item.max_score || 100}
                            </span>
                          ) : isSubmitted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Pending
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedAssignment(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          {isSubmitted ? 'Resubmit' : 'Submit Work'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">
                    No homework assignments found.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 5: ACADEMIC PERFORMANCE */}
          {activeTab === 'grades' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Academic Performance Report</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Official grades and examination evaluations recorded by tutors.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Assigned Tutor</th>
                      <th className="py-3.5 px-4">Percentage Score</th>
                      <th className="py-3.5 px-4">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {gradesSummary?.courses && gradesSummary.courses.length > 0 ? (
                      gradesSummary.courses.map((c) => (
                        <tr key={c.course_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{c.title}</p>
                            <p className="font-mono text-[10px] text-slate-500">{c.code}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {c.teacher_name || 'Assigned Tutor'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {c.percent !== null ? `${c.percent}%` : 'Pending Evaluation'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {c.gpa_points !== null ? c.gpa_points : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          No assessment performance records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 6: ATTENDANCE LOGS */}
          {activeTab === 'attendance' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Personal Attendance Record</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Verified attendance roll call marked by teachers per class session.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Marked By</th>
                      <th className="py-3.5 px-4">Session Status</th>
                      <th className="py-3.5 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {attendanceRecords.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{log.session_date}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{log.course_title}</p>
                          <p className="font-mono text-[10px] text-slate-500">{log.course_code}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{log.teacher_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            log.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">{log.notes || 'Routine verify'}</td>
                      </tr>
                    ))}
                    {attendanceRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">No attendance records logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 7: STUDENT PROFILE */}
          {activeTab === 'profile' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Student Profile &amp; Enrollment ID</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Verified SHS registration credentials.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isAccountActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                  Status: {isAccountActive ? 'Active' : 'Payment Pending'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{studentProfile?.name || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Student Index Number</span>
                  <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{studentProfile?.student_number || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{studentProfile?.email || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact Phone</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{studentProfile?.phone || 'Not Registered'}</p>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Operating Cohort Batch</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {studentProfile?.cohort?.name || 'Vacation Classes Session'} ({studentProfile?.cohort?.code || 'VAC'})
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* MODAL: VIEW INSTRUCTIONS & PROMPT BRIEF */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {viewingAssignment.course?.code || viewingAssignment.course_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{viewingAssignment.title}</h3>
              </div>
              <button onClick={() => setViewingAssignment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">Detailed Instructions:</p>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {viewingAssignment.instructions || viewingAssignment.description || 'No additional written instructions provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-400 font-mono">
                <div>Due Date: <strong className="text-rose-600 dark:text-rose-400">{viewingAssignment.due_at?.slice(0, 10) || viewingAssignment.due_date}</strong></div>
                <div>Max Score: <strong className="text-slate-900 dark:text-white">{viewingAssignment.max_score || 100} pts</strong></div>
              </div>

              {Boolean(
                viewingAssignment.has_prompt_attachment ||
                viewingAssignment.attachment_path ||
                viewingAssignment.has_attachment ||
                viewingAssignment.attachment_url
              ) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = viewingAssignment.attachment_url || `/api/v1/student/assignments/${viewingAssignment.id}/download`;
                      downloadAuthenticatedFile(url, `${viewingAssignment.title.replace(/\s+/g, '_')}_brief.docx`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Attached Task Brief</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingAssignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT ASSIGNMENT (WITH DIRECT FILE UPLOAD) */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedAssignment.course?.code || selectedAssignment.course_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedAssignment.title}</h3>
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Written Response / Working Out
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your answer, working, or submission notes..."
                  value={submissionForm.submission_text}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, submission_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Upload Document / Solution File */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Attach Solution Document (PDF, DOCX, ZIP, PNG)
                </label>
                <div className="relative flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => setSubmissionForm({ ...submissionForm, file: e.target.files[0] || null })}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-950 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {submissionForm.file && (
                    <button
                      type="button"
                      onClick={() => setSubmissionForm({ ...submissionForm, file: null })}
                      className="text-slate-400 hover:text-rose-500 ml-2 cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {submissionForm.file && (
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached: {submissionForm.file.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Or External Link (Google Drive / GitHub)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={submissionForm.attachment_url}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, attachment_url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-emerald-600 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {isSubmitting ? 'Uploading...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs outline-none"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
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

const studentRoot = document.getElementById('student-portal-root');
if (studentRoot) {
  ReactDOM.createRoot(studentRoot).render(
    <React.StrictMode>
      <StudentPortalDashboard />
    </React.StrictMode>
  );
}

export default StudentPortalDashboard;