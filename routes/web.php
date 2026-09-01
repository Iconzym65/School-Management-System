<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin-portal', function () {
    return view('admin-portal');
});

Route::get('/student-portal', function () {
    return view('student-portal');
});

Route::get('/teacher-portal', function () {
    return view('teacher-portal');
});

Route::get('/login', function () {
    return view('student-login');
})->name('login');

Route::get('/student-login', function () {
    return view('student-login');
});

Route::get('/register', function () {
    return view('student-register');
})->name('register');