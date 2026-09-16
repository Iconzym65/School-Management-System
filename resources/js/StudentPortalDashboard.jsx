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
  ChevronRight,
  Eye,
  Bell,
  CheckSquare,
  TrendingUp,
  CalendarCheck,
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

  // Collapsible Header on Scroll
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrolledPast = e.currentTarget.scrollTop > 24;
    if (scrolledPast !== isScrolled) {
      setIsScrolled(scrolledPast);
    }
  };

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // Live Data Stores from Backend
  const [studentProfile, setStudentProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradesSummary, setGradesSummary] = useState(null);

  // Modals & Forms
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

  // Primary Data Fetcher (Strictly Enrolled Cohort Data)
  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
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

      let dashboardData = null;
      try {
        dashboardData = await apiFetch('/student/dashboard');
      } catch (_) {}

      const [coursesRes, timetableRes, assignmentsRes, attendanceRes, gradesRes] = await Promise.allSettled([
        apiFetch('/student/courses'),
        apiFetch('/student/timetable'),
        apiFetch('/student/assignments'),
        apiFetch('/student/attendance'),
        apiFetch('/student/grades')
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
  }, []);

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

  // Computed Task Counts
  const pendingAssignments = useMemo(() => {
    return assignments.filter((a) => !a.submission);
  }, [assignments]);

  const pendingAssignmentsCount = pendingAssignments.length;
  const totalAssignmentsCount = assignments.length;

  // Normalized Grades Calculation
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

  // Average Grade: Dynamic, returns N/A if no graded records
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

  // Attendance Rate: Dynamic, returns N/A if no logs found
  const attendanceRate = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'N/A';
    const present = attendanceRecords.filter((r) => String(r.status).toUpperCase() === 'PRESENT').length;
    return `${((present / attendanceRecords.length) * 100).toFixed(0)}%`;
  }, [attendanceRecords]);

  // Completion percentage
  const taskCompletionRate = useMemo(() => {
    if (totalAssignmentsCount === 0) return 0;
    const completed = totalAssignmentsCount - pendingAssignmentsCount;
    return Math.round((completed / totalAssignmentsCount) * 100);
  }, [totalAssignmentsCount, pendingAssignmentsCount]);

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

  // Clean Greeting Name preserving titles if present
  const studentGreetingName = useMemo(() => {
    if (!studentProfile?.name) return 'Student';
    const parts = studentProfile.name.trim().split(/\s+/);
    const honorifics = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'rev.', 'mr', 'mrs', 'ms', 'dr', 'prof'];
    if (honorifics.includes(parts[0].toLowerCase()) && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  }, [studentProfile]);

  const dynamicGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedCurrentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Handlers
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 flex font-sans antialiased transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      
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

      {/* ======================= SIDEBAR ======================= */}
      <aside
        className={`bg-[#0F172A] text-slate-300 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 relative z-30 ${
          sidebarOpen ? 'w-[260px]' : 'w-[78px]'
        }`}
      >
        <div>
          {/* Logo & Brand Header */}
          <div className="h-20 flex items-center gap-3.5 px-5 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20 shrink-0">
              S
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-wide leading-tight">SHS Student Desk</h1>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Student portal</p>
              </div>
            )}
          </div>

          {/* Section Heading */}
          {sidebarOpen && (
            <div className="px-5 pt-6 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80">Navigation</span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'timetable', label: 'Virtual Lessons & Links', icon: Video },
              { id: 'courses', label: 'My Subjects', icon: BookOpen, badge: enrolledCourses.length },
              { id: 'assignments', label: 'Exercises & Tasks', icon: CheckSquare, badge: totalAssignmentsCount },
              { id: 'grades', label: 'Academic Performance', icon: TrendingUp },
              { id: 'attendance', label: 'My Attendance Logs', icon: CalendarCheck },
              { id: 'profile', label: 'Student Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-blue-400 font-black text-[10px] flex items-center justify-center shrink-0 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Help Widget */}
        <div className="p-4 space-y-3">
          {sidebarOpen && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 text-xs shadow-inner">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white text-[11px]">Need some help?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Your academic coordinator is available during school hours.
              </p>
              <button
                onClick={() => setActiveTab('profile')}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Contact support</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {sidebarOpen && (
            <div className="px-2 pt-1">
              <span className="text-[10px] text-slate-400/60 font-mono tracking-wider">Student Desk • v2.4</span>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3.5 top-24 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform hidden md:flex"
          title="Toggle Navigation"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>
      </aside>

      {/* ======================= MAIN CONTENT FRAME ======================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar with Collapsing Scroll Transition & NO Cohort Dropdown */}
        <header
          className={`sticky top-0 z-40 transition-all duration-300 ease-in-out border-b px-6 sm:px-8 flex items-center justify-between shrink-0 ${
            isScrolled
              ? 'h-16 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md shadow-md border-slate-200/90 dark:border-slate-800'
              : 'h-20 bg-white dark:bg-[#0F172A] border-slate-200/80 dark:border-slate-800'
          }`}
        >
          {/* Left: Active Enrolled Cohort Display Only */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                Active Enrolled Program
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {studentProfile?.cohort?.name || 'SHS Vacation Classes Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Header Utilities & Profile */}
          <div className="flex items-center gap-3">
            
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

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${
                isScrolled ? 'p-2' : 'p-2.5'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Sync Refresh */}
            <button
              onClick={loadStudentData}
              disabled={isLoading}
              className={`rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 ${
                isScrolled ? 'p-2' : 'p-2.5'
              }`}
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Notification Bell */}
            <button className={`rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer relative ${
              isScrolled ? 'p-2' : 'p-2.5'
            }`}>
              <Bell className="w-4 h-4" />
              {pendingAssignmentsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-2 right-2"></span>
              )}
            </button>

            {/* Student Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                className="flex items-center gap-3 pl-2 sm:pl-3 cursor-pointer py-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {studentProfile?.name ? studentProfile.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {studentProfile?.name || 'Student'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {studentProfile?.student_number || 'STU-Auto'}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${studentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {studentDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{studentProfile?.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{studentProfile?.email}</p>
                    <div className="mt-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAccountActive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {isAccountActive ? 'Tuition Verified' : 'Payment Gated'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setActiveTab('profile'); setStudentDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => { setShowPasswordModal(true); setStudentDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer"
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

        {/* Viewport Content with Scroll Listener */}
        <main
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 scroll-smooth"
        >
          {/* Tuition Payment Pending Notice */}
          {!isAccountActive && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">Tuition Payment Pending — Live Virtual Access Restricted</h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Your registration is confirmed, but virtual lecture coordinates remain locked until cleared by campus administration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-[1400px] mx-auto">
              
              {/* Header Greeting & Date Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{dynamicGreeting}, {studentGreetingName}</span>
                    <span className="inline-block animate-bounce origin-bottom-right">👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Here's what's happening with your classes today.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-xs self-start sm:self-auto">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {formattedCurrentDate}
                  </span>
                </div>
              </div>

              {/* 5 Reactive KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                
                {/* 1. Registered Subjects */}
                <div
                  onClick={() => setActiveTab('courses')}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Enrolled</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {enrolledCourses.length}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Registered Subjects</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 2. Total Tasks */}
                <div
                  onClick={() => { setActiveTab('assignments'); setAssignmentFilter('all'); }}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Total</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {totalAssignmentsCount}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Total Tasks</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 3. Average Score */}
                <div
                  onClick={() => setActiveTab('grades')}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {averageGrade !== 'N/A' ? 'Evaluated' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {averageGrade}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Average Score</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 4. Attendance Rate */}
                <div
                  onClick={() => setActiveTab('attendance')}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                      {attendanceRate !== 'N/A' ? 'Verified' : 'No records'}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {attendanceRate}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Attendance Rate</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 5. Pending Tasks (Action Card) */}
                <div
                  onClick={() => { setActiveTab('assignments'); setAssignmentFilter('pending'); }}
                  className={`bg-white dark:bg-[#0F172A] p-6 rounded-2xl border shadow-xs flex flex-col justify-between h-[155px] cursor-pointer transition-all group ${
                    pendingAssignmentsCount > 0
                      ? 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400 hover:shadow-md'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      pendingAssignmentsCount > 0
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      pendingAssignmentsCount > 0
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {pendingAssignmentsCount > 0 ? 'Action Required' : 'All Completed'}
                    </span>
                  </div>
                  <div>
                    <p className={`text-3xl font-black leading-none ${
                      pendingAssignmentsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {pendingAssignmentsCount}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Pending Tasks</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

              </div>

              {/* 2-Column Split: Today's Schedule & Upcoming Tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left (2 Columns Wide): Today's Lesson Schedule */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Today's Lesson Schedule
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {timetableSlots.length} {timetableSlots.length === 1 ? 'class' : 'classes'} scheduled for today
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('timetable')}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Full schedule</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {timetableSlots.length > 0 ? (
                        timetableSlots.slice(0, 4).map((slot) => (
                          <div
                            key={slot.id}
                            className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-center shrink-0">
                                <span className="block text-[10px] font-black tracking-wider uppercase">
                                  {slot.day_of_week ? String(slot.day_of_week).slice(0, 3) : 'DAY'}
                                </span>
                                <span className="block text-xs font-black">
                                  {slot.start_time ? String(slot.start_time).slice(0, 5) : '--:--'}
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {slot.course?.code || slot.course_code || 'CRS'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {slot.course?.title || slot.course_title || 'Enrolled Subject'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                  {slot.teacher_name || slot.teacher?.name || 'Assigned Tutor'} • {slot.start_time || '--'} – {slot.end_time || '--'}
                                </p>
                              </div>
                            </div>

                            {/* Meeting Action Button */}
                            {isAccountActive && slot.meeting_open ? (
                              <a
                                href={formatExternalUrl(slot.meeting_link)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-transform active:scale-95 shrink-0"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Live Lesson</span>
                              </a>
                            ) : (
                              <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold shrink-0">
                                <Lock className="w-3.5 h-3.5" />
                                <span>{!isAccountActive ? 'Payment Gated' : 'Opens at Scheduled Time'}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No live lectures scheduled on your timetable for today.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right (1 Column Wide): Upcoming Tasks */}
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Upcoming Tasks
                        </h3>
                        {pendingAssignmentsCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black flex items-center justify-center">
                            {pendingAssignmentsCount}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => { setActiveTab('assignments'); setAssignmentFilter('pending'); }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                      >
                        View all
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {pendingAssignments.length > 0 ? (
                        pendingAssignments.slice(0, 4).map((item, idx) => {
                          const borderColors = ['border-l-rose-500', 'border-l-blue-500', 'border-l-amber-500', 'border-l-indigo-500'];
                          const borderClass = borderColors[idx % borderColors.length];

                          return (
                            <div
                              key={item.id}
                              className={`pl-3.5 py-1 border-l-4 ${borderClass} flex items-center justify-between gap-3`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                                  {item.course?.code || item.course_code || 'TASK'}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 mt-0.5">
                                  Due {item.due_at?.slice(0, 10) || item.due_date || 'soon'}
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedAssignment(item);
                                  setActiveTab('assignments');
                                }}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                              >
                                Submit Work
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No pending tasks due. All coursework up to date!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Learning Activity Progress Tracker Banner */}
              <div className="rounded-2xl bg-[#0F172A] text-white p-5 sm:p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">Academic Progress Tracker</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {totalAssignmentsCount > 0 
                        ? `You have completed ${totalAssignmentsCount - pendingAssignmentsCount} of ${totalAssignmentsCount} assigned tasks.`
                        : 'No assigned homework tasks recorded yet.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-56">
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${taskCompletionRate}%` }}
                    ></div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-300">{taskCompletionRate}%</span>
                </div>
              </div>

            </div>
          )}

          {/* ==================== TAB 2: VIRTUAL LESSONS (TIMETABLE) ==================== */}
          {activeTab === 'timetable' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Virtual Classroom Schedule</h2>
                <p className="text-xs text-slate-400">Scheduled Zoom or Google Meet classes for your enrolled vacation batch.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {timetableSlots.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {slot.course?.code || slot.course_code}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {slot.virtual_platform || 'Live Session'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{slot.course?.title || slot.course_title}</h4>
                      <p className="text-xs text-slate-400 font-medium">Tutor: {slot.teacher_name || slot.teacher?.name || 'Assigned Tutor'}</p>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1">
                        <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> {slot.day_of_week}</p>
                        <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-500" /> {slot.start_time} - {slot.end_time}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      {isAccountActive && slot.meeting_open ? (
                        <a
                          href={formatExternalUrl(slot.meeting_link)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Launch Live Classroom</span>
                        </a>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{!isAccountActive ? 'Payment Gated' : 'Opens at Scheduled Time'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {timetableSlots.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
                    No scheduled timetable slots found for this batch.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ==================== TAB 3: REGISTERED SUBJECTS ==================== */}
          {activeTab === 'courses' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registered SHS Modules</h2>
                <p className="text-xs text-slate-400">Academic modules and faculty mentors allocated to your active term.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {course.credit_hours || 3} Credits
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {course.description || 'Comprehensive exam preparation and syllabus mastery.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Tutor: {course.teacher?.name || course.timetables?.[0]?.teacher?.name || 'Assigned Tutor'}
                      </span>
                    </div>
                  </div>
                ))}
                {enrolledCourses.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
                    No active course enrollments found.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ==================== TAB 4: EXERCISES & TASKS ==================== */}
          {activeTab === 'assignments' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assignments & Problem Sets</h2>
                  <p className="text-xs text-slate-400">Inspect assignment briefs, download attached files, and submit completed coursework.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      assignmentFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({assignments.length})
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('pending')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      assignmentFilter === 'pending'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pending ({pendingAssignmentsCount})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAssignments.map((item) => {
                  const isSubmitted = Boolean(item.submission?.submitted_at);
                  const isGraded = item.submission && item.submission.score !== null && item.submission.score !== undefined;
                  const hasAttachment = Boolean(
                    item.has_prompt_attachment ||
                    item.attachment_path ||
                    item.has_attachment ||
                    item.attachment_url
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {item.course?.code || item.course_code || 'CRS'}
                          </span>
                          <span className="text-[10px] font-mono text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-2.5 py-0.5 rounded-full">
                            Due: {item.due_at?.slice(0, 10) || item.due_date}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{item.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                            {item.instructions || item.description || 'Click below to review instructions and attached brief.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingAssignment(item)}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
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

                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          {isGraded ? (
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Mark: {item.submission.score} / {item.max_score || 100}
                            </span>
                          ) : isSubmitted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Pending
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedAssignment(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          {isSubmitted ? 'Resubmit' : 'Submit Work'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
                    No assignments found for this filter.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ==================== TAB 5: ACADEMIC PERFORMANCE ==================== */}
          {activeTab === 'grades' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic Performance Report</h2>
                  <p className="text-xs text-slate-400">Official grades and examination evaluations recorded by tutors.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-right">
                  <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400">Cumulative Standing</p>
                  <p className="text-xl font-black text-emerald-900 dark:text-emerald-300">{averageGrade}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Assigned Tutor</th>
                      <th className="py-3.5 px-4">Percentage Score</th>
                      <th className="py-3.5 px-4">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {normalizedGradeCourses.length > 0 ? (
                      normalizedGradeCourses.map((c) => (
                        <tr key={c.course_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{c.title}</p>
                            <p className="font-mono text-[10px] text-slate-400">{c.code}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
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

          {/* ==================== TAB 6: ATTENDANCE LOGS ==================== */}
          {activeTab === 'attendance' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Attendance Record</h2>
                <p className="text-xs text-slate-400">Verified attendance roll call marked by teachers per class session.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/80 dark:border-slate-800">
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
                          <p className="font-mono text-[10px] text-slate-400">{log.course_code}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{log.teacher_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic">{log.notes || 'Routine verify'}</td>
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

          {/* ==================== TAB 7: STUDENT PROFILE ==================== */}
          {activeTab === 'profile' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Student Profile</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Verified registration credentials.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isAccountActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                  Status: {isAccountActive ? 'Active' : 'Payment Pending'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{studentProfile?.name || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Student Index Number</span>
                  <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{studentProfile?.student_number || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{studentProfile?.email || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact Phone</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{studentProfile?.phone || 'Not Registered'}</p>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Cohort / Academic Program</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {studentProfile?.cohort?.name || 'Vacation Classes Session'} ({studentProfile?.cohort?.code || 'VAC'})
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ======================= MODALS ======================= */}

      {/* 1. View Instructions Modal */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {viewingAssignment.course?.code || viewingAssignment.course_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{viewingAssignment.title}</h3>
              </div>
              <button onClick={() => setViewingAssignment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">Detailed Instructions:</p>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {viewingAssignment.instructions || viewingAssignment.description || 'No additional written instructions provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-400 font-mono">
                <div>Due Date: <strong className="text-rose-500">{viewingAssignment.due_at?.slice(0, 10) || viewingAssignment.due_date}</strong></div>
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
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Submit Task Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {selectedAssignment.course?.code || selectedAssignment.course_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedAssignment.title}</h3>
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Written Response / Working Out
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your answer, working, or submission notes..."
                  value={submissionForm.submission_text}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, submission_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                  Attach Solution Document (PDF, DOCX, ZIP, PNG)
                </label>
                <div className="relative flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => setSubmissionForm({ ...submissionForm, file: e.target.files[0] || null })}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-blue-600 dark:text-blue-400 outline-none"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {isSubmitting ? 'Uploading...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new_password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
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