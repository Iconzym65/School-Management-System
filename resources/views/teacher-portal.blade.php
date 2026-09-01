<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Teacher Portal</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/TeacherPortalDashboard.jsx'])
    </head>
    <body class="bg-slate-100 text-slate-800 antialiased">
        <div id="teacher-portal-root"></div>
    </body>
</html>