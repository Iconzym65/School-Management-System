<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Student Login</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/StudentLogin.jsx'])
    </head>
    <body class="bg-slate-950 text-slate-100 antialiased">
        <div id="student-login-root"></div>
    </body>
</html>