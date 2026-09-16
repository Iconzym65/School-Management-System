<?php

use Illuminate\Support\Facades\Route;

// Public Views
Route::get('/', fn () => redirect()->route('login'));

Route::get('/', function () {
    return view('landing');
})->name('landing');

Route::get('/login', fn () => view('student-login'))->name('login');
Route::get('/student-login', fn () => view('student-login'))->name('student.login');
Route::get('/admin-login', fn () => view('admin-login'))->name('admin.login');
Route::get('/teacher-login', fn () => view('teacher-login'))->name('teacher.login');
Route::get('/register', fn () => view('student-register'))->name('register');

// Portal Shell Views (Loads React SPAs)
Route::get('/admin-portal', fn () => view('admin-portal'))->name('admin.portal');
Route::get('/teacher-portal', fn () => view('teacher-portal'))->name('teacher.portal');
Route::get('/student-portal', fn () => view('student-portal'))->name('student.portal');

// Password Reset View
Route::get('/reset-password', fn () => view('reset-password'))->name('password.reset');
