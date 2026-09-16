import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  Calendar,
  Clock,
  Video,
  Award,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  X,
  Moon,
  Sun,
  FileText,
  Bell,
  ChevronRight,
  Filter
} from 'lucide-react';
import { validatePortalAccess, clearAuth } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Normalizes raw arrays, paginated responses, and Laravel Resource wrappers
const unwrapList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.teachers)) return res.teachers;
  if (Array.isArray(res.students)) return res.students;
  if (Array.isArray(res.courses)) return res.courses;
  if (Array.isArray(res.timetables)) return res.timetables;
  if (Array.isArray(res.cohorts)) return res.cohorts;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

// Formats virtual classroom links safely
const formatExternalUrl = (url) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Core API Fetch Helper
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
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

// Clipboard copy helper
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise((resolve, reject) => {
    document.execCommand('copy') ? resolve() : reject(new Error('Copy failed'));
    textArea.remove();
  });
}

export const AdminPortalDashboard = () => {
  useEffect(() => {
    validatePortalAccess('admin').catch(() => {});
  }, []);

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('sms_theme') === 'dark';
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('sms_theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Dynamic Collapsible Header State on Scroll
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrolledPast = e.currentTarget.scrollTop > 24;
    if (scrolledPast !== isScrolled) {
      setIsScrolled(scrolledPast);
    }
  };

  // Navigation & UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // Global System-Wide Batch Filter Key
  const [globalCohortId, setGlobalCohortId] = useState(
    localStorage.getItem('active_cohort_id') || ''
  );

  // Core Data Stores
  const [adminUser, setAdminUser] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [assignmentAudits, setAssignmentAudits] = useState([]);
  const [studentApplications, setStudentApplications] = useState([]);
  const [settings, setSettings] = useState({ attendance_edit_window_hours: 24, meeting_link_opens_minutes_before: 15 });

  // Modals State
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showAssignCohortModal, setShowAssignCohortModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter & Credential States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [createdTeacherCreds, setCreatedTeacherCreds] = useState(null);
  const [createdStudentCreds, setCreatedStudentCreds] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedStudentKey, setCopiedStudentKey] = useState(false);

  // Forms State
  const [cohortForm, setCohortForm] = useState({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
  const [assignForm, setAssignForm] = useState({ student_id: '', cohort_id: '' });
  const [teacherForm, setTeacherForm] = useState({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [studentForm, setStudentForm] = useState({ id: 0, name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE', course_ids: [] });
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [courseForm, setCourseForm] = useState({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    id: 0,
    course_id: '',
    teacher_id: '',
    day_of_week: 'MONDAY',
    start_time: '09:00',
    end_time: '10:30',
    classroom: 'Virtual Studio Alpha',
    delivery_mode: 'VIRTUAL',
    virtual_platform: 'zoom',
    meeting_link: '',
  });
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const showToastNotification = (message, type = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Primary System-Wide Data Loader
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allCohortQuery = globalCohortId ? `?cohort_id=${globalCohortId}&all=1` : '?all=1';
      const cohortQuery = globalCohortId ? `?cohort_id=${globalCohortId}` : '';

      const [userRes, cohortsRes, teachersRes, studentsRes, coursesRes, ttRes, attendanceRes, settingsRes] = await Promise.allSettled([
        apiFetch('/auth/me'),
        apiFetch('/admin/cohorts?all=1'),
        apiFetch('/admin/teachers?all=1'),
        apiFetch(`/admin/students${allCohortQuery}`),
        apiFetch(`/admin/courses${allCohortQuery}`),
        apiFetch(`/admin/timetables${allCohortQuery}`),
        apiFetch(`/admin/attendance${cohortQuery}`),
        apiFetch('/admin/settings'),
      ]);

      if (userRes.status === 'fulfilled') {
        const u = userRes.value?.user || userRes.value?.data || userRes.value;
        setAdminUser(u);
        setProfileForm((prev) => ({
          ...prev,
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
        }));
      }

      if (cohortsRes.status === 'fulfilled') setCohorts(unwrapList(cohortsRes.value));
      if (teachersRes.status === 'fulfilled') setTeachers(unwrapList(teachersRes.value));
      if (studentsRes.status === 'fulfilled') setStudents(unwrapList(studentsRes.value));
      if (coursesRes.status === 'fulfilled') setCourses(unwrapList(coursesRes.value));
      if (ttRes.status === 'fulfilled') setTimetables(unwrapList(ttRes.value));
      if (attendanceRes.status === 'fulfilled') setAttendanceLogs(unwrapList(attendanceRes.value));
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value || { attendance_edit_window_hours: 24, meeting_link_opens_minutes_before: 15 });

      apiFetch(`/admin/student-applications?status=PENDING_APPROVAL${globalCohortId ? `&cohort_id=${globalCohortId}` : ''}`)
        .then((res) => setStudentApplications(unwrapList(res)))
        .catch(() => {});
    } catch (err) {
      showToastNotification(err.message || 'Failed to sync with server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [globalCohortId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Student Metrics
  const activeStudentsCount = useMemo(() => {
    return students.filter((s) => s.status === 'ACTIVE' || s.status === 'active').length;
  }, [students]);

  const inactiveStudentsCount = useMemo(() => {
    return students.filter((s) => s.status === 'INACTIVE_PAYMENT_PENDING' || s.status === 'INACTIVE').length;
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.student_number && s.student_number.toLowerCase().includes(studentSearch.toLowerCase()));
      const matchStatus = studentStatusFilter === 'all' ? true : s.status === studentStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, studentSearch, studentStatusFilter]);

  // Clean Administrator Greeting Name
  const cleanAdminName = useMemo(() => {
    if (!adminUser?.name) return 'Admin';
    const parts = adminUser.name.trim().split(/\s+/);
    const honorifics = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'rev.', 'mr', 'mrs', 'ms', 'dr', 'prof'];
    if (honorifics.includes(parts[0].toLowerCase()) && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  }, [adminUser]);

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
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (profileForm.password) {
        if (profileForm.password !== profileForm.password_confirmation) {
          throw new Error('New passwords do not match.');
        }
        await apiFetch('/auth/password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: profileForm.current_password,
            password: profileForm.password,
            password_confirmation: profileForm.password_confirmation,
          }),
        });
      }

      showToastNotification('Admin profile updated successfully!', 'success');
      setProfileForm((prev) => ({
        ...prev,
        current_password: '',
        password: '',
        password_confirmation: '',
      }));
    } catch (err) {
      showToastNotification(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCohort = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/admin/cohorts', {
        method: 'POST',
        body: JSON.stringify({
          name: cohortForm.name,
          code: cohortForm.code.toUpperCase(),
          starts_on: cohortForm.starts_on,
          ends_on: cohortForm.ends_on,
          is_active: Boolean(cohortForm.is_active),
        }),
      });
      showToastNotification(`Batch ${cohortForm.name} created!`, 'success');
      setShowCohortModal(false);
      setCohortForm({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to create vacation batch', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStudentToCohort = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch(`/admin/students/${assignForm.student_id}`, {
        method: 'PUT',
        body: JSON.stringify({ cohort_id: parseInt(assignForm.cohort_id, 10) }),
      });
      showToastNotification('Student assigned to batch!', 'success');
      setShowAssignCohortModal(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to assign student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditingTeacher) {
        await apiFetch(`/admin/teachers/${teacherForm.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: teacherForm.name,
            email: teacherForm.email,
            phone: teacherForm.phone,
            employee_id: teacherForm.employee_id,
          }),
        });
        showToastNotification('Teacher details updated!', 'success');
      } else {
        const payload = {
          name: teacherForm.name,
          email: teacherForm.email,
          phone: teacherForm.phone || '+233 00 000 0000',
          employee_id: teacherForm.employee_id || `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
        };

        const res = await apiFetch('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const tempPass = res?.temporary_password || res?.data?.temporary_password || 'Dispatched via Email';
        setCreatedTeacherCreds({
          login_email: payload.email,
          temporary_password: tempPass,
          staff_id: payload.employee_id,
        });

        showToastNotification('Teacher provisioned & credentials issued!', 'success');
      }
      setShowTeacherModal(false);
      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save teacher', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: studentForm.name,
        email: studentForm.email,
        phone: studentForm.phone,
        status: studentForm.status,
        cohort_id: studentForm.cohort_id ? parseInt(studentForm.cohort_id, 10) : (globalCohortId ? parseInt(globalCohortId, 10) : undefined),
        course_ids: (studentForm.course_ids || []).map((id) => parseInt(id, 10)),
      };

      if (isEditingStudent) {
        await apiFetch(`/admin/students/${studentForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification('Student profile updated!', 'success');
      } else {
        const res = await apiFetch('/admin/students', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const tempPass = res?.temporary_password || res?.data?.temporary_password || 'Student@2026';
        const stNum = res?.student?.student_number || res?.data?.student?.student_number || 'STU-Auto';

        setCreatedStudentCreds({
          name: payload.name,
          email: payload.email,
          student_number: stNum,
          temporary_password: tempPass,
        });

        showToastNotification('Student enrolled successfully!', 'success');
      }

      setShowStudentModal(false);
      setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE', course_ids: [] });
      setIsEditingStudent(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStudentStatus = async (student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE_PAYMENT_PENDING' : 'ACTIVE';
    try {
      await apiFetch(`/admin/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToastNotification(`Student access updated to ${nextStatus === 'ACTIVE' ? 'Active (Paid)' : 'Gated (Unpaid)'}`, 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to update student status', 'error');
    }
  };

  const handleApproveApplication = async (application) => {
    try {
      await apiFetch(`/admin/student-applications/${application.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'INACTIVE_PAYMENT_PENDING' }),
      });
      showToastNotification('Application approved & added to roster.', 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to approve application.', 'error');
    }
  };

  const handleRejectApplication = async (application) => {
    const rejection_reason = window.prompt('Reason for rejecting this application:');
    if (!rejection_reason?.trim()) return;

    try {
      await apiFetch(`/admin/student-applications/${application.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejection_reason.trim() }),
      });
      showToastNotification('Application rejected.', 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to reject application.', 'error');
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetCohortId = courseForm.cohort_id || globalCohortId || cohorts[0]?.id;
      const payload = {
        code: courseForm.code.toUpperCase(),
        title: courseForm.title,
        credit_hours: Number(courseForm.credit_hours),
        description: courseForm.description,
        cohort_id: parseInt(targetCohortId, 10),
        teacher_id: courseForm.teacher_id ? parseInt(courseForm.teacher_id, 10) : undefined,
      };

      if (isEditingCourse) {
        await apiFetch(`/admin/courses/${courseForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification(`Subject ${courseForm.code} updated!`, 'success');
      } else {
        await apiFetch('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToastNotification(`Subject ${courseForm.code} created!`, 'success');
      }

      setShowCourseModal(false);
      setIsEditingCourse(false);
      setCourseForm({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save subject', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTimetable = async (e) => {
    e.preventDefault();
    if (!timetableForm.course_id || !timetableForm.teacher_id) {
      showToastNotification('Please select both a Subject and an Instructor.', 'error');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      course_id: parseInt(timetableForm.course_id, 10),
      teacher_id: parseInt(timetableForm.teacher_id, 10),
      day_of_week: timetableForm.day_of_week,
      start_time: timetableForm.start_time,
      end_time: timetableForm.end_time,
      classroom: timetableForm.classroom,
      delivery_mode: timetableForm.delivery_mode,
      virtual_platform: timetableForm.virtual_platform,
      meeting_link: timetableForm.meeting_link,
      meeting_opens_minutes_before: 15,
    };

    try {
      if (isEditingTimetable) {
        await apiFetch(`/admin/timetables/${timetableForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification('Timetable lesson updated!', 'success');
      } else {
        await apiFetch('/admin/timetables', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToastNotification('Lesson scheduled with video link!', 'success');
      }
      setShowTimetableModal(false);
      setIsEditingTimetable(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save timetable slot', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const endpointMap = {
        cohort: `/admin/cohorts/${deleteTarget.id}`,
        teacher: `/admin/teachers/${deleteTarget.id}`,
        student: `/admin/students/${deleteTarget.id}`,
        course: `/admin/courses/${deleteTarget.id}`,
        timetable: `/admin/timetables/${deleteTarget.id}`,
      };

      await apiFetch(endpointMap[deleteTarget.type], { method: 'DELETE' });
      showToastNotification(`${deleteTarget.title} was removed successfully.`, 'success');
      setDeleteTarget(null);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || `Failed to delete ${deleteTarget.type}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 flex font-sans antialiased transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      
      {/* Toast Alert */}
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
              A
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-wide leading-tight">SHS Admin Desk</h1>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Central workspace</p>
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
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'teachers', label: 'Teaching Staff', icon: Users, badge: teachers.length },
              { id: 'students', label: 'Students Directory', icon: GraduationCap, badge: students.length },
              { id: 'cohorts', label: 'Vacation Batches', icon: Layers, badge: cohorts.length },
              { id: 'courses', label: 'Curriculum Subjects', icon: BookOpen, badge: courses.length },
              { id: 'timetables', label: 'Class Schedules', icon: Video },
              { id: 'attendance', label: 'Attendance Audits', icon: FileSpreadsheet },
              { id: 'assignments', label: 'Grades & Tasks', icon: Award },
              { id: 'profile', label: 'Admin Security', icon: User },
              { id: 'settings', label: 'System Presets', icon: Settings },
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

        {/* Sidebar Footer Cards */}
        <div className="p-4 space-y-3">
          {sidebarOpen && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/60 text-xs shadow-inner">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white text-[11px]">System Console</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Manage accounts, tuition clearance switches, and master schedules.
              </p>
              <button
                onClick={() => setActiveTab('settings')}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Console Configuration</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {sidebarOpen && (
            <div className="px-2 pt-1">
              <span className="text-[10px] text-slate-400/60 font-mono tracking-wider">Admin Desk • v2.4</span>
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
        
        {/* Dynamic Collapsible Top Header */}
        <header
          className={`sticky top-0 z-40 transition-all duration-300 ease-in-out border-b px-6 sm:px-8 flex items-center justify-between shrink-0 ${
            isScrolled
              ? 'h-16 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md shadow-md border-slate-200/90 dark:border-slate-800'
              : 'h-20 bg-white dark:bg-[#0F172A] border-slate-200/80 dark:border-slate-800'
          }`}
        >
          {/* Left Session & System-Wide Batch Filter Dropdown */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="hidden lg:block">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                  System Batch Filter
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${globalCohortId ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {globalCohortId ? (cohorts.find(c => String(c.id) === String(globalCohortId))?.name || 'Selected Batch') : 'All Batches (Global View)'}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>

              {/* Dynamic Global Batch Filter Dropdown */}
              <div className="relative">
                <select
                  value={globalCohortId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setGlobalCohortId(newId);
                    if (newId) localStorage.setItem('active_cohort_id', newId);
                    else localStorage.removeItem('active_cohort_id');
                  }}
                  className={`appearance-none border text-xs font-bold rounded-xl pl-3.5 pr-8 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${
                    isScrolled
                      ? 'py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700'
                      : 'py-2 bg-slate-50 dark:bg-slate-800 border-slate-200/90 dark:border-slate-700'
                  } text-slate-800 dark:text-slate-100`}
                >
                  <option value="">-- All Vacation Batches (Global) --</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.code || 'VAC'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Header Utilities & Profile */}
          <div className="flex items-center gap-3">
            
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
              onClick={loadAllData}
              disabled={isLoading}
              className={`rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 ${
                isScrolled ? 'p-2' : 'p-2.5'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Notification Bell */}
            <button className={`rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer relative ${
              isScrolled ? 'p-2' : 'p-2.5'
            }`}>
              <Bell className="w-4 h-4" />
              {studentApplications.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2"></span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center gap-3 pl-2 sm:pl-3 cursor-pointer py-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {adminUser?.name ? adminUser.name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {adminUser?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Super Admin
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{adminUser?.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{adminUser?.email}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Super Administrator
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setActiveTab('profile'); setAdminDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>My Profile & Security</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('settings'); setAdminDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Console Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        clearAuth();
                        window.location.replace('/login');
                      }}
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
          
          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-[1400px] mx-auto">
              
              {/* Header Greeting & Date Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{dynamicGreeting}, {cleanAdminName}</span>
                    <span className="inline-block animate-bounce origin-bottom-right">👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    System Filter: <strong className="text-blue-600 dark:text-blue-400">{globalCohortId ? (cohorts.find(c => String(c.id) === String(globalCohortId))?.name || 'Selected Batch') : 'All Vacation Batches Active'}</strong>.
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
                
                {/* 1. Total Students */}
                <div
                  onClick={() => { setActiveTab('students'); setStudentStatusFilter('all'); }}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Roster</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {students.length}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Total Students</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 2. Paid / Active Access */}
                <div
                  onClick={() => { setActiveTab('students'); setStudentStatusFilter('ACTIVE'); }}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Verified</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {activeStudentsCount}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Tuition Cleared</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 3. Unpaid / Access Gated */}
                <div
                  onClick={() => { setActiveTab('students'); setStudentStatusFilter('INACTIVE_PAYMENT_PENDING'); }}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Gated</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
                      {inactiveStudentsCount}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Payment Pending</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 4. Faculty Tutors */}
                <div
                  onClick={() => setActiveTab('teachers')}
                  className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-[155px] cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Faculty</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {teachers.length}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Teaching Staff</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

                {/* 5. Active Applications */}
                <div
                  onClick={() => setActiveTab('students')}
                  className={`bg-white dark:bg-[#0F172A] p-6 rounded-2xl border shadow-xs flex flex-col justify-between h-[155px] cursor-pointer transition-all group ${
                    studentApplications.length > 0
                      ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-400 hover:shadow-md'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      studentApplications.length > 0
                        ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      studentApplications.length > 0
                        ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {studentApplications.length > 0 ? 'Pending Action' : 'All Reviewed'}
                    </span>
                  </div>
                  <div>
                    <p className={`text-3xl font-black leading-none ${
                      studentApplications.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {studentApplications.length}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>New Admissions</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </p>
                  </div>
                </div>

              </div>

              {/* 2-Column Split: Admission Requests & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left (2 Columns Wide): Pending Applications */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Candidate Admission Applications
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {studentApplications.length} candidate applications awaiting administrative approval
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('students')}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View all roster</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {studentApplications.length > 0 ? (
                        studentApplications.slice(0, 4).map((app) => (
                          <div
                            key={app.id}
                            className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {app.first_name} {app.last_name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {app.student_email} • {app.cohort?.name || 'Vacation Session'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveApplication(app)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                              >
                                Approve & Gate
                              </button>
                              <button
                                onClick={() => handleRejectApplication(app)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No pending admission applications. All candidates processed!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right (1 Column Wide): Admin Quick Actions */}
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="pb-5 border-b border-slate-100 dark:border-slate-800/80">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Admin Quick Actions
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Standard operational workflows
                      </p>
                    </div>

                    <div className="mt-5 space-y-3.5">
                      <button
                        onClick={() => {
                          setIsEditingStudent(false);
                          setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: globalCohortId || cohorts[0]?.id || '', status: 'ACTIVE', course_ids: [] });
                          setShowStudentModal(true);
                        }}
                        className="w-full p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-600/10 border border-blue-200/70 dark:border-blue-500/20 hover:bg-blue-100/70 dark:hover:bg-blue-600/20 text-blue-700 dark:text-blue-400 flex items-center gap-3.5 text-left transition-all cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Enroll SHS Student</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Register candidate and generate index number</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsEditingTeacher(false);
                          setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
                          setShowTeacherModal(true);
                        }}
                        className="w-full p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-600/10 border border-emerald-200/70 dark:border-emerald-500/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-3.5 text-left transition-all cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Provision Teacher</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Create tutor profile and issue login key</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setShowCohortModal(true)}
                        className="w-full p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-600/10 border border-purple-200/70 dark:border-purple-500/20 hover:bg-purple-100/70 dark:hover:bg-purple-600/20 text-purple-700 dark:text-purple-400 flex items-center gap-3.5 text-left transition-all cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Create Vacation Batch</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Set term dates and intake code</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsEditingTimetable(false);
                          setTimetableForm({
                            id: 0,
                            course_id: courses[0]?.id?.toString() || '',
                            teacher_id: teachers[0]?.id?.toString() || '',
                            day_of_week: 'MONDAY',
                            start_time: '09:00',
                            end_time: '10:30',
                            classroom: 'Virtual Studio Alpha',
                            delivery_mode: 'VIRTUAL',
                            virtual_platform: 'zoom',
                            meeting_link: '',
                          });
                          setShowTimetableModal(true);
                        }}
                        className="w-full p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-600/10 border border-rose-200/70 dark:border-rose-500/20 hover:bg-rose-100/70 dark:hover:bg-rose-600/20 text-rose-700 dark:text-rose-400 flex items-center gap-3.5 text-left transition-all cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Schedule Class Slot</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Attach Zoom or Google Meet URL</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Administrative Status Banner */}
              <div className="rounded-2xl bg-[#0F172A] text-white p-5 sm:p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">Campus Administrative Readiness</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      System running across {cohorts.length} vacation batches, {courses.length} subjects, and {students.length} students.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-56">
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full w-[100%] transition-all duration-700"></div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-300">100% Online</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: TEACHING STAFF ==================== */}
          {activeTab === 'teachers' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Teaching Staff & Tutors</h2>
                  <p className="text-xs text-slate-400">Provision instructor accounts, assign subjects, and manage access.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTeacher(false);
                    setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
                    setShowTeacherModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision Teacher</span>
                </button>
              </div>

              {createdTeacherCreds && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Teacher Account Provisioned & Logins Ready!
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Email:</strong> {createdTeacherCreds.login_email}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Staff ID:</strong> {createdTeacherCreds.staff_id}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-blue-600 dark:text-blue-400 font-bold">
                        <strong>Temp Pass:</strong> {createdTeacherCreds.temporary_password}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const credText = `Teacher Portal Login:\nEmail: ${createdTeacherCreds.login_email}\nStaff ID: ${createdTeacherCreds.staff_id}\nPassword: ${createdTeacherCreds.temporary_password}`;
                      try {
                        await copyToClipboard(credText);
                        setCopiedKey(true);
                        showToastNotification('Credentials copied!', 'success');
                        setTimeout(() => setCopiedKey(false), 3000);
                      } catch (_) {
                        showToastNotification('Please copy credentials manually.', 'error');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKey ? 'Copied' : 'Copy Logins'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {teachers.map((teacher) => {
                  const assigned = courses.filter((c) => {
                    const assignedSlot = timetables.find((tt) => Number(tt.course_id) === Number(c.id));
                    const teacherId = c.teacher_id || c.teacher?.id || assignedSlot?.teacher_id;
                    return Number(teacherId) === Number(teacher.id);
                  });

                  return (
                    <div key={teacher.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shadow-xs">
                            {(teacher.name || 'T').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{teacher.name}</h4>
                            <p className="text-[11px] font-mono text-slate-400">ID: {teacher.employee_id || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {teacher.email}</p>
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {teacher.phone || 'No phone'}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Assigned Subjects ({assigned.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {assigned.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">No assigned subjects</span>
                            ) : (
                              assigned.map((c) => (
                                <span key={c.id} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {c.code}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTeacherForm({
                              id: teacher.id,
                              name: teacher.name,
                              email: teacher.email,
                              phone: teacher.phone || '',
                              employee_id: teacher.employee_id || '',
                              course_id: '',
                            });
                            setIsEditingTeacher(true);
                            setShowTeacherModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'teacher', id: teacher.id, title: `Teacher: ${teacher.name}` })}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== TAB 3: STUDENTS DIRECTORY ==================== */}
          {activeTab === 'students' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">SHS Students & Tuition Firewall</h2>
                  <p className="text-xs text-slate-400">Manage student registrations, academic enrollment, and tuition access clearance.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingStudent(false);
                    setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: globalCohortId || cohorts[0]?.id || '', status: 'ACTIVE', course_ids: [] });
                    setShowStudentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
              </div>

              {createdStudentCreds && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Student Registered & Credentials Ready!
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Name:</strong> {createdStudentCreds.name}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Login:</strong> {createdStudentCreds.email}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Index:</strong> {createdStudentCreds.student_number}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-blue-600 dark:text-blue-400 font-bold">
                        <strong>Password:</strong> {createdStudentCreds.temporary_password}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const credText = `Student Credentials:\nName: ${createdStudentCreds.name}\nLogin: ${createdStudentCreds.email}\nIndex No: ${createdStudentCreds.student_number}\nPassword: ${createdStudentCreds.temporary_password}`;
                      try {
                        await copyToClipboard(credText);
                        setCopiedStudentKey(true);
                        showToastNotification('Credentials copied!', 'success');
                        setTimeout(() => setCopiedStudentKey(false), 3000);
                      } catch (_) {
                        showToastNotification('Please copy credentials manually.', 'error');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {copiedStudentKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedStudentKey ? 'Copied' : 'Copy Student Logins'}
                  </button>
                </div>
              )}

              {/* Search & Status Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students by name, email, or index number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All Students ({students.length})</option>
                    <option value="ACTIVE">Active (Tuition Paid) ({activeStudentsCount})</option>
                    <option value="INACTIVE_PAYMENT_PENDING">Gated (Payment Pending) ({inactiveStudentsCount})</option>
                  </select>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Vacation Batch</th>
                      <th className="py-3.5 px-4">Access Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {filteredStudents.map((s) => {
                      const isActive = s.status === 'ACTIVE';
                      const studentCohort = cohorts.find((c) => Number(c.id) === Number(s.cohort_id));
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{s.student_number || 'STU-Auto'}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <p>{s.email}</p>
                            <p className="text-[11px] text-slate-400">{s.phone || 'No phone'}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            {studentCohort ? (
                              <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                {studentCohort.code}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isActive ? 'Active (Paid)' : 'Gated (Unpaid)'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleStudentStatus(s)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isActive ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              {isActive ? 'Gate Access' : 'Clear Payment'}
                            </button>
                            <button
                              onClick={() => {
                                const enrolledIds = (s.enrollments || []).map((e) => e.course_id || e.course?.id).filter(Boolean);
                                setStudentForm({
                                  id: s.id,
                                  name: s.name,
                                  email: s.email,
                                  phone: s.phone || '',
                                  cohort_id: s.cohort_id || '',
                                  status: s.status || 'ACTIVE',
                                  course_ids: enrolledIds,
                                });
                                setIsEditingStudent(true);
                                setShowStudentModal(true);
                              }}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl inline-block cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'student', id: s.id, title: `Student: ${s.name}` })}
                              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl inline-block cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================== TAB 4: VACATION BATCHES ==================== */}
          {activeTab === 'cohorts' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vacation Batches & Intakes</h2>
                  <p className="text-xs text-slate-400">Manage intake sessions, vacation terms, and student cohort allocations.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignCohortModal(true)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Assign Student
                  </button>
                  <button
                    onClick={() => setShowCohortModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    Create Batch
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cohorts.map((cohort) => {
                  const regCount = students.filter((s) => Number(s.cohort_id) === Number(cohort.id)).length;
                  return (
                    <div key={cohort.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            {cohort.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cohort.is_active ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            {cohort.is_active ? 'Active' : 'Closed'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">{cohort.name}</h3>
                        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <p>Start: {cohort.starts_on || 'N/A'}</p>
                          <p>End: {cohort.ends_on || 'N/A'}</p>
                          <p className="font-bold text-blue-600 dark:text-blue-400 mt-2">{regCount} Students Enrolled</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={() => setDeleteTarget({ type: 'cohort', id: cohort.id, title: `Batch: ${cohort.name}` })}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== TAB 5: CURRICULUM SUBJECTS ==================== */}
          {activeTab === 'courses' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">SHS Subjects & Syllabi</h2>
                  <p className="text-xs text-slate-400">Curriculum catalog and assigned subject instructors.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingCourse(false);
                    setCourseForm({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: globalCohortId || cohorts[0]?.id || '', teacher_id: '' });
                    setShowCourseModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Add Subject
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => {
                  const cohort = cohorts.find((c) => Number(c.id) === Number(course.cohort_id)) || course.cohort;
                  const assignedSlot = timetables.find((tt) => Number(tt.course_id) === Number(course.id));
                  const teacherId = course.teacher_id || course.teacher?.id || assignedSlot?.teacher_id;
                  const teacher = teachers.find((t) => Number(t.id) === Number(teacherId)) || course.teacher || assignedSlot?.teacher;

                  return (
                    <div key={course.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {course.code}
                          </span>
                          {cohort && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                              {cohort.code}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mt-3">{course.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.description || 'No syllabus overview provided.'}</p>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs text-slate-400">
                          <p>Teacher: <strong className="text-slate-900 dark:text-white">{teacher?.name || 'Unassigned'}</strong></p>
                          <p>Credit Units: <strong className="text-slate-900 dark:text-white">{course.credit_hours || 3}</strong></p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCourseForm({
                              id: course.id,
                              code: course.code,
                              title: course.title,
                              credit_hours: course.credit_hours || 3,
                              description: course.description || '',
                              cohort_id: course.cohort_id || '',
                              teacher_id: course.teacher_id || assignedSlot?.teacher_id || '',
                            });
                            setIsEditingCourse(true);
                            setShowCourseModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'course', id: course.id, title: `Subject: ${course.code}` })}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== TAB 6: TIMETABLES & VIRTUAL SCHEDULES ==================== */}
          {activeTab === 'timetables' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subject Timetables & Virtual Classrooms</h2>
                  <p className="text-xs text-slate-400">Configure Zoom or Google Meet links for student live classrooms.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTimetable(false);
                    setTimetableForm({
                      id: 0,
                      course_id: courses[0]?.id?.toString() || '',
                      teacher_id: teachers[0]?.id?.toString() || '',
                      day_of_week: 'MONDAY',
                      start_time: '09:00',
                      end_time: '10:30',
                      classroom: 'Virtual Studio Alpha',
                      delivery_mode: 'VIRTUAL',
                      virtual_platform: 'zoom',
                      meeting_link: '',
                    });
                    setShowTimetableModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Create Lesson Slot
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {timetables.map((slot) => {
                  const course = courses.find((c) => Number(c.id) === Number(slot.course_id));
                  const teacher = teachers.find((t) => Number(t.id) === Number(slot.teacher_id));
                  return (
                    <div key={slot.id} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {course?.code || slot.course_code}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            {slot.virtual_platform || 'Virtual'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{course?.title || slot.course_title}</h4>
                        <p className="text-xs text-slate-400 font-medium">Teacher: {teacher?.name || slot.teacher_name || 'Unassigned'}</p>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1 font-mono text-slate-600 dark:text-slate-300">
                          <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500" /> {slot.day_of_week}</p>
                          <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> {slot.start_time} - {slot.end_time}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTimetableForm({
                              id: slot.id,
                              course_id: slot.course_id?.toString() || '',
                              teacher_id: slot.teacher_id?.toString() || '',
                              day_of_week: slot.day_of_week,
                              start_time: slot.start_time,
                              end_time: slot.end_time,
                              classroom: slot.classroom || '',
                              delivery_mode: slot.delivery_mode || 'VIRTUAL',
                              virtual_platform: slot.virtual_platform || 'zoom',
                              meeting_link: slot.meeting_link || '',
                            });
                            setIsEditingTimetable(true);
                            setShowTimetableModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'timetable', id: slot.id, title: `Slot: ${course?.code || slot.id}` })}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== TAB 7: ATTENDANCE AUDITS ==================== */}
          {activeTab === 'attendance' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Audit Trail</h2>
                  <p className="text-xs text-slate-400">System logs of daily attendance registers recorded by faculty instructors.</p>
                </div>
                <button
                  onClick={loadAllData}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Marked By</th>
                      <th className="py-3.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {attendanceLogs.map((log) => {
                      const isPresent = String(log.status).toUpperCase() === 'PRESENT';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{log.session_date}</td>
                          <td className="py-3.5 px-4 font-mono text-blue-600 dark:text-blue-400 font-bold">{log.course_code}</td>
                          <td className="py-3.5 px-4 text-slate-900 dark:text-white font-bold">
                            {log.student_name} <span className="font-mono text-slate-400 font-normal">({log.student_number})</span>
                          </td>
                          <td className="py-3.5 px-4 uppercase font-bold">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                              isPresent
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{log.marked_by}</td>
                          <td className="py-3.5 px-4 text-slate-400 italic">{log.notes || 'Routine verify'}</td>
                        </tr>
                      );
                    })}
                    {attendanceLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">No attendance records logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================== TAB 8: GRADES & TASKS ==================== */}
          {activeTab === 'assignments' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs max-w-[1400px] mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic Assessment Audit</h2>
                <p className="text-xs text-slate-400">Institutional overview of assignments, problem sets, and student grades.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Task Title</th>
                      <th className="py-3.5 px-4">Assigned Tutor</th>
                      <th className="py-3.5 px-4">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {courses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{c.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{c.title} Syllabus Assessments</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{c.teacher?.name || 'Allocated Tutor'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">Active Term</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ==================== TAB 9: PROFILE & SECURITY ==================== */}
          {activeTab === 'profile' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Administrator Profile & Security</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage root administrator credentials and account security.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Account Email</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">Update Security Password</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={profileForm.current_password}
                      onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={profileForm.password_confirmation}
                      onChange={(e) => setProfileForm({ ...profileForm, password_confirmation: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ==================== TAB 10: CONFIGURATION ==================== */}
          {activeTab === 'settings' && (
            <section className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs mx-auto">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Institutional Presets</h2>
                <p className="text-xs text-slate-400 mt-0.5">Global configuration rules for attendance registers and virtual session links.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Attendance Register Window</h4>
                    <p className="text-slate-400 mt-0.5">Allow teachers to edit registers within this timeframe.</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold font-mono">
                    {settings.attendance_edit_window_hours} Hours
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Early Classroom Access</h4>
                    <p className="text-slate-400 mt-0.5">Unlock Zoom/Meet links prior to scheduled period start.</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold font-mono">
                    {settings.meeting_link_opens_minutes_before} Minutes
                  </span>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ======================= MODALS ======================= */}

      {/* 1. Modal: Provision / Edit Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditingTeacher ? 'Edit Teacher Details' : 'Provision Teacher Account'}
              </h3>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeacher} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Kojo Mensah"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="mensah@school.edu"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+233 54 112 3344"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Staff ID</label>
                <input
                  type="text"
                  placeholder="e.g. TCH-8890"
                  value={teacherForm.employee_id}
                  onChange={(e) => setTeacherForm({ ...teacherForm, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowTeacherModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Saving...' : isEditingTeacher ? 'Update Teacher' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Enroll / Edit Student */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{isEditingStudent ? 'Edit Student Details' : 'Enroll SHS Student'}</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="kwame@shs.test"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+233 24 100 0000"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Vacation Batch</label>
                <select
                  value={studentForm.cohort_id}
                  onChange={(e) => setStudentForm({ ...studentForm, cohort_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">Select Batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tuition Access Status</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Tuition Paid)</option>
                  <option value="INACTIVE_PAYMENT_PENDING">GATED (Payment Pending)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowStudentModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Saving...' : isEditingStudent ? 'Update Student' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Create Batch */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Vacation Batch</h3>
              <button onClick={() => setShowCohortModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCohort} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August 2026 SHS Vacation Classes"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Batch Code</label>
                <input
                  type="text"
                  required
                  placeholder="VAC-2026-AUG"
                  value={cohortForm.code}
                  onChange={(e) => setCohortForm({ ...cohortForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-mono uppercase outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.starts_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, starts_on: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.ends_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, ends_on: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Creating...' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Assign Cohort */}
      {showAssignCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Student to Batch</h3>
              <button onClick={() => setShowAssignCohortModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignStudentToCohort} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Select Student</label>
                <select
                  required
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">Choose student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_number || s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Select Batch</label>
                <select
                  required
                  value={assignForm.cohort_id}
                  onChange={(e) => setAssignForm({ ...assignForm, cohort_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">Choose batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAssignCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Assigning...' : 'Assign Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Subject (Course) */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{isEditingCourse ? 'Edit Subject' : 'Add New Subject'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CORE-MATH"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-mono uppercase outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Mathematics (SHS 1-3)"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Vacation Batch</label>
                <select
                  required
                  value={courseForm.cohort_id}
                  onChange={(e) => setCourseForm({ ...courseForm, cohort_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">Select Batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Assign Teacher</label>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'Tutor'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Syllabus Overview</label>
                <textarea
                  rows={2}
                  placeholder="Brief curriculum description..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Saving...' : isEditingCourse ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Timetable Slot */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditingTimetable ? 'Edit Lesson Slot' : 'Create Lesson Slot'}
              </h3>
              <button onClick={() => setShowTimetableModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTimetable} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                <select
                  required
                  value={timetableForm.course_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const matchedCourse = courses.find((c) => String(c.id) === String(cId));
                    setTimetableForm({
                      ...timetableForm,
                      course_id: cId,
                      teacher_id: matchedCourse?.teacher_id ? String(matchedCourse.teacher_id) : timetableForm.teacher_id,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">-- Choose Subject --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Instructor</label>
                <select
                  required
                  value={timetableForm.teacher_id}
                  onChange={(e) => setTimetableForm({ ...timetableForm, teacher_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="">-- Choose Instructor --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'Tutor'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Day of Week</label>
                  <select
                    value={timetableForm.day_of_week}
                    onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Platform</label>
                  <select
                    value={timetableForm.virtual_platform}
                    onChange={(e) => setTimetableForm({ ...timetableForm, virtual_platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Meeting URL (Zoom / Meet)</label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  value={timetableForm.meeting_link}
                  onChange={(e) => setTimetableForm({ ...timetableForm, meeting_link: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-mono text-blue-600 dark:text-blue-400 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowTimetableModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20">
                  {isSubmitting ? 'Saving...' : 'Save Lesson Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/60 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Removal</h3>
                <p className="text-xs text-slate-400 mt-0.5">{deleteTarget.title}</p>
              </div>
            </div>
            <p className="text-slate-400">
              Are you sure you want to permanently delete this record? This action cannot be undone.
            </p>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer">Cancel</button>
              <button
                onClick={handleExecuteDelete}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" /> {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('admin-portal-root') || document.getElementById('app');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <AdminPortalDashboard />
    </React.StrictMode>
  );
}

export default AdminPortalDashboard;