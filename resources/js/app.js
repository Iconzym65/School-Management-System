import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';

const STORAGE_KEY = 'school_admin_token';

const toArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
};

const normalizeUser = (user) => ({
    ...user,
    status: user?.status ?? 'ACTIVE',
    roleSlug: user?.role?.slug ?? user?.role_slug ?? 'student',
    roleName: user?.role?.name ?? user?.role_name ?? 'User',
});

const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem(STORAGE_KEY) || window.__APP_TOKEN__ || '';
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Request failed.');
    }

    return payload;
};

const statusLabel = (status) => {
    if (!status) return 'Unknown';

    const map = {
        ACTIVE: 'Active',
        SUSPENDED: 'Suspended',
        INACTIVE_PAYMENT_PENDING: 'Inactive',
    };

    return map[status] ?? status;
};

const dayOptions = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function AdminPortal() {
    const [activeSubTab, setActiveSubTab] = useState('teachers');
    const [tokenInput, setTokenInput] = useState(localStorage.getItem(STORAGE_KEY) || '');
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [cohorts, setCohorts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const [teacherForm, setTeacherForm] = useState({
        name: '',
        email: '',
        phone: '',
        employee_id: '',
    });

    const [courseForm, setCourseForm] = useState({
        cohort_id: '',
        code: '',
        title: '',
        credit_hours: '3',
        description: '',
    });

    const [timetableForm, setTimetableForm] = useState({
        course_id: '',
        teacher_id: '',
        day_of_week: 'MONDAY',
        start_time: '09:00',
        end_time: '10:30',
        classroom: 'Room A',
        delivery_mode: 'VIRTUAL',
        meeting_link: 'https://zoom.us/j/example',
        meeting_opens_minutes_before: 15,
    });

    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showTimetableModal, setShowTimetableModal] = useState(false);
    const [isEditingTimetable, setIsEditingTimetable] = useState(false);
    const [editingTimetableId, setEditingTimetableId] = useState(null);
    const [pendingCredentials, setPendingCredentials] = useState(null);

    const teachersList = useMemo(() => teachers.map(normalizeUser), [teachers]);
    const studentsList = useMemo(() => students.map(normalizeUser), [students]);

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    const setToken = () => {
        const value = tokenInput.trim();
        if (!value) {
            localStorage.removeItem(STORAGE_KEY);
            setToast({ type: 'success', message: 'Removed saved API token.' });
            return;
        }

        localStorage.setItem(STORAGE_KEY, value);
        setToast({ type: 'success', message: 'API token saved locally.' });
    };

    const loadAllData = async () => {
        setIsLoading(true);

        try {
            const [teachersRes, studentsRes, coursesRes, timetablesRes, cohortsRes] = await Promise.all([
                apiFetch('/api/v1/admin/teachers'),
                apiFetch('/api/v1/admin/students'),
                apiFetch('/api/v1/admin/courses'),
                apiFetch('/api/v1/admin/timetables'),
                apiFetch('/api/v1/admin/cohorts'),
            ]);

            setTeachers(toArray(teachersRes.data));
            setStudents(toArray(studentsRes.data));
            setCourses(toArray(coursesRes.data));
            setTimetables(toArray(timetablesRes.data));
            setCohorts(toArray(cohortsRes.data));

            if (!timetableForm.course_id && toArray(coursesRes.data).length) {
                setTimetableForm((prev) => ({ ...prev, course_id: toArray(coursesRes.data)[0].id }));
            }
            if (!timetableForm.teacher_id && toArray(teachersRes.data).length) {
                setTimetableForm((prev) => ({ ...prev, teacher_id: toArray(teachersRes.data)[0].id }));
            }
        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Could not load the admin portal data.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTeacher = async (event) => {
        event.preventDefault();

        try {
            const payload = {
                name: teacherForm.name,
                email: teacherForm.email,
                phone: teacherForm.phone || '0000000000',
                employee_id: teacherForm.employee_id || `EMP-${Date.now()}`,
            };

            const response = await apiFetch('/api/v1/admin/teachers', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            setPendingCredentials(response.data);
            setTeacherForm({ name: '', email: '', phone: '', employee_id: '' });
            setShowTeacherModal(false);
            setToast({ type: 'success', message: response.message || 'Teacher created.' });
            loadAllData();
        } catch (error) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleCreateCourse = async (event) => {
        event.preventDefault();

        try {
            const payload = {
                cohort_id: Number(courseForm.cohort_id),
                code: courseForm.code,
                title: courseForm.title,
                credit_hours: Number(courseForm.credit_hours),
                description: courseForm.description,
            };

            await apiFetch('/api/v1/admin/courses', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            setCourseForm({
                cohort_id: '',
                code: '',
                title: '',
                credit_hours: '3',
                description: '',
            });
            setShowCourseModal(false);
            setToast({ type: 'success', message: 'Course created.' });
            loadAllData();
        } catch (error) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleSaveTimetable = async (event) => {
        event.preventDefault();

        try {
            const payload = {
                ...timetableForm,
                course_id: Number(timetableForm.course_id),
                teacher_id: Number(timetableForm.teacher_id),
                meeting_opens_minutes_before: Number(timetableForm.meeting_opens_minutes_before),
            };

            if (isEditingTimetable) {
                await apiFetch(`/api/v1/admin/timetables/${editingTimetableId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                setToast({ type: 'success', message: 'Timetable updated.' });
            } else {
                await apiFetch('/api/v1/admin/timetables', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                setToast({ type: 'success', message: 'Timetable created.' });
            }

            setShowTimetableModal(false);
            setIsEditingTimetable(false);
            setEditingTimetableId(null);
            setTimetableForm({
                course_id: courses[0]?.id ?? '',
                teacher_id: teachersList[0]?.id ?? '',
                day_of_week: 'MONDAY',
                start_time: '09:00',
                end_time: '10:30',
                classroom: 'Room A',
                delivery_mode: 'VIRTUAL',
                meeting_link: 'https://zoom.us/j/example',
                meeting_opens_minutes_before: 15,
            });
            loadAllData();
        } catch (error) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleToggleStudentStatus = async (student) => {
        const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE_PAYMENT_PENDING' : 'ACTIVE';

        try {
            await apiFetch(`/api/v1/admin/students/${student.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: nextStatus }),
            });
            setToast({ type: 'success', message: `Student status updated to ${statusLabel(nextStatus)}.` });
            loadAllData();
        } catch (error) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleDelete = async (type, id) => {
        const mapped = {
            teacher: `/api/v1/admin/teachers/${id}`,
            student: `/api/v1/admin/students/${id}`,
            course: `/api/v1/admin/courses/${id}`,
            timetable: `/api/v1/admin/timetables/${id}`,
        };

        if (!mapped[type]) return;

        try {
            await apiFetch(mapped[type], { method: 'DELETE' });
            setToast({ type: 'success', message: 'Record deleted.' });
            loadAllData();
        } catch (error) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const stats = {
        totalTeachers: teachersList.length,
        activeStudents: studentsList.filter((s) => s.status === 'ACTIVE').length,
        totalCourses: courses.length,
        inactiveStudents: studentsList.filter((s) => s.status !== 'ACTIVE').length,
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            {toast && (
                <div className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${
                    toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}>
                    {toast.message}
                </div>
            )}

            <div className="mx-auto max-w-7xl space-y-6">
                <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="mb-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700">
                                Administrative Central Module
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900">Administrative Control Center</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Centralized management for faculty, student status, curricula, timetables, and virtual classroom scheduling.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-blue-500 md:w-80"
                                value={tokenInput}
                                onChange={(event) => setTokenInput(event.target.value)}
                                placeholder="Bearer token (optional)"
                            />
                            <button
                                onClick={setToken}
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                                Save Token
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        {[{ label: 'Active Students', value: stats.activeStudents, tone: 'emerald' }, { label: 'Staff / Lecturers', value: stats.totalTeachers, tone: 'blue' }, { label: 'Open Courses', value: stats.totalCourses, tone: 'indigo' }, { label: 'Inactive Students', value: stats.inactiveStudents, tone: 'amber' }].map((metric) => (
                            <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className={`h-full rounded-full ${
                                        metric.tone === 'emerald' ? 'w-3/4 bg-emerald-500' :
                                        metric.tone === 'blue' ? 'w-1/2 bg-blue-500' :
                                        metric.tone === 'indigo' ? 'w-2/3 bg-indigo-500' : 'w-1/3 bg-amber-500'
                                    }`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </header>

                <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    {[
                        ['teachers', 'Faculty & Staff'],
                        ['students', 'Student Firewall'],
                        ['courses', 'Courses & Lecturers'],
                        ['timetables', 'Timetable & Virtual Links'],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveSubTab(key)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                activeSubTab === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                {isLoading && (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                        Loading admin data...
                    </div>
                )}

                {!isLoading && activeSubTab === 'teachers' && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Faculty Staff Accounts</h2>
                                <p className="text-sm text-slate-500">Teachers are provisioned exclusively by the administrator.</p>
                            </div>
                            <button
                                onClick={() => setShowTeacherModal(true)}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                            >
                                Provision Teacher
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {teachersList.map((teacher) => (
                                <div key={teacher.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
                                            {teacher.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'T'}
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
                                            {teacher.employee_id || 'EMP-STAFF'}
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-base font-bold text-slate-900">{teacher.name}</h3>
                                    <p className="text-sm text-blue-700">{teacher.roleName}</p>
                                    <p className="mt-1 text-xs text-slate-500">{teacher.email}</p>
                                    <p className="mt-2 text-xs text-slate-500">Phone: {teacher.phone || 'Not provided'}</p>

                                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                            ● Active Faculty
                                        </span>
                                        <button
                                            onClick={() => handleDelete('teacher', teacher.id)}
                                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {!isLoading && activeSubTab === 'students' && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Payment-Gated Student Firewall</h2>
                            <p className="text-sm text-slate-500">Students must be ACTIVE to access the portal and course resources.</p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Student</th>
                                        <th className="px-4 py-3 font-semibold">Student Number</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsList.map((student) => (
                                        <tr key={student.id} className="border-t border-slate-200">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-slate-900">{student.name}</p>
                                                    <p className="text-xs text-slate-500">{student.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-600">{student.student_number || 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    student.status === 'ACTIVE'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                                }`}>
                                                    {statusLabel(student.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleStudentStatus(student)}
                                                        className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                    >
                                                        {student.status === 'ACTIVE' ? 'Gate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('student', student.id)}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {!isLoading && activeSubTab === 'courses' && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Course Curriculum & Lecturer Assignments</h2>
                                <p className="text-sm text-slate-500">Create academic offerings and align them with lecturers.</p>
                            </div>
                            <button
                                onClick={() => setShowCourseModal(true)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                            >
                                Create & Assign Course
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {courses.map((course) => (
                                <div key={course.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-blue-700">
                                            {course.code}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{course.credit_hours || 3} Credits</span>
                                    </div>

                                    <h3 className="mt-3 text-lg font-bold text-slate-900">{course.title}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{course.description || 'No description provided.'}</p>

                                    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                                        <p><span className="font-semibold text-slate-700">Vacation cohort:</span> {course.cohort?.name || 'Unassigned'}</p>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleDelete('course', course.id)}
                                            className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                                        >
                                            Delete Course
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {!isLoading && activeSubTab === 'timetables' && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Course Timetable & Virtual Links</h2>
                                <p className="text-sm text-slate-500">Administration manages recurring classroom slots and attached links.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsEditingTimetable(false);
                                    setEditingTimetableId(null);
                                    setShowTimetableModal(true);
                                }}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                            >
                                Generate Schedule Slot
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {timetables.map((slot) => (
                                <div key={slot.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                                            {slot.course?.code || 'Course'}
                                        </span>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                                            {slot.delivery_mode === 'VIRTUAL' ? 'Zoom / Meet' : slot.delivery_mode}
                                        </span>
                                    </div>

                                    <h3 className="mt-3 text-base font-bold text-slate-900">{slot.course?.title || 'Course title'}</h3>
                                    <p className="text-xs text-slate-500">Lecturer: {slot.teacher?.name || 'Unknown'}</p>

                                    <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                        <p><span className="font-semibold text-slate-700">Day:</span> {slot.day_of_week}</p>
                                        <p><span className="font-semibold text-slate-700">Time:</span> {slot.start_time} - {slot.end_time}</p>
                                        <p><span className="font-semibold text-slate-700">Room:</span> {slot.classroom || 'N/A'}</p>
                                    </div>

                                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Meeting Link</p>
                                        <p className="mt-1 break-all text-xs text-blue-700">{slot.meeting_link || 'No link attached.'}</p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                                        <button
                                            onClick={() => {
                                                setIsEditingTimetable(true);
                                                setEditingTimetableId(slot.id);
                                                setTimetableForm({
                                                    course_id: slot.course_id,
                                                    teacher_id: slot.teacher_id,
                                                    day_of_week: slot.day_of_week,
                                                    start_time: slot.start_time,
                                                    end_time: slot.end_time,
                                                    classroom: slot.classroom || 'Room A',
                                                    delivery_mode: slot.delivery_mode || 'VIRTUAL',
                                                    meeting_link: slot.meeting_link || 'https://zoom.us/j/example',
                                                    meeting_opens_minutes_before: slot.meeting_opens_minutes_before || 15,
                                                });
                                                setShowTimetableModal(true);
                                            }}
                                            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete('timetable', slot.id)}
                                            className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {showTeacherModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Provision Teacher Account</h3>
                            <button onClick={() => setShowTeacherModal(false)} className="text-xl text-slate-500">×</button>
                        </div>

                        {pendingCredentials ? (
                            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                <p className="font-bold">Teacher account provisioned successfully.</p>
                                <p><span className="font-semibold">Email:</span> {pendingCredentials.teacher?.email}</p>
                                <p><span className="font-semibold">Temporary password:</span> {pendingCredentials.temporary_password}</p>
                                <button
                                    onClick={() => setPendingCredentials(null)}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                                >
                                    Add another teacher
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateTeacher} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                                    <input
                                        value={teacherForm.name}
                                        onChange={(event) => setTeacherForm({ ...teacherForm, name: event.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Email address</label>
                                    <input
                                        type="email"
                                        value={teacherForm.email}
                                        onChange={(event) => setTeacherForm({ ...teacherForm, email: event.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                                        <input
                                            value={teacherForm.phone}
                                            onChange={(event) => setTeacherForm({ ...teacherForm, phone: event.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Employee ID</label>
                                        <input
                                            value={teacherForm.employee_id}
                                            onChange={(event) => setTeacherForm({ ...teacherForm, employee_id: event.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowTeacherModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                                        Cancel
                                    </button>
                                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                                        Create teacher
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showCourseModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Create Course</h3>
                            <button onClick={() => setShowCourseModal(false)} className="text-xl text-slate-500">×</button>
                        </div>

                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Vacation Cohort / Batch</label>
                                    <select value={courseForm.cohort_id} onChange={(event) => setCourseForm({ ...courseForm, cohort_id: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                                        <option value="">Select Vacation Cohort</option>
                                        {cohorts.map((cohort) => (
                                            <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Credit hours</label>
                                    <input type="number" min="1" max="12" value={courseForm.credit_hours} onChange={(event) => setCourseForm({ ...courseForm, credit_hours: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Course code</label>
                                    <input value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                                    <input value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                                <textarea value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowCourseModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Create course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTimetableModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">{isEditingTimetable ? 'Edit Timetable Slot' : 'Create Timetable Slot'}</h3>
                            <button onClick={() => setShowTimetableModal(false)} className="text-xl text-slate-500">×</button>
                        </div>

                        <form onSubmit={handleSaveTimetable} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
                                    <select value={timetableForm.course_id} onChange={(event) => setTimetableForm({ ...timetableForm, course_id: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                                        <option value="">Select course</option>
                                        {courses.map((course) => (
                                            <option key={course.id} value={course.id}>{course.code} — {course.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Lecturer</label>
                                    <select value={timetableForm.teacher_id} onChange={(event) => setTimetableForm({ ...timetableForm, teacher_id: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                                        <option value="">Select lecturer</option>
                                        {teachersList.map((teacher) => (
                                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Day</label>
                                    <select value={timetableForm.day_of_week} onChange={(event) => setTimetableForm({ ...timetableForm, day_of_week: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                                        {dayOptions.map((day) => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Delivery mode</label>
                                    <select value={timetableForm.delivery_mode} onChange={(event) => setTimetableForm({ ...timetableForm, delivery_mode: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                                        <option value="VIRTUAL">VIRTUAL</option>
                                        <option value="CLASSROOM">CLASSROOM</option>
                                        <option value="HYBRID">HYBRID</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Start time</label>
                                    <input type="time" value={timetableForm.start_time} onChange={(event) => setTimetableForm({ ...timetableForm, start_time: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">End time</label>
                                    <input type="time" value={timetableForm.end_time} onChange={(event) => setTimetableForm({ ...timetableForm, end_time: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Classroom</label>
                                    <input value={timetableForm.classroom} onChange={(event) => setTimetableForm({ ...timetableForm, classroom: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Open X minutes before</label>
                                    <input type="number" min="0" max="120" value={timetableForm.meeting_opens_minutes_before} onChange={(event) => setTimetableForm({ ...timetableForm, meeting_opens_minutes_before: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Meeting link</label>
                                <input value={timetableForm.meeting_link} onChange={(event) => setTimetableForm({ ...timetableForm, meeting_link: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowTimetableModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                                    {isEditingTimetable ? 'Update timetable' : 'Create timetable'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const root = document.getElementById('admin-portal-root');
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <AdminPortal />
        </React.StrictMode>
    );
}
