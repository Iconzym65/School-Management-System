<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Student Registration - Academic Klinik</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/StudentRegistration.jsx'])
    </head>
    <body class="bg-[#072421] text-slate-800 antialiased min-h-screen">
        <div id="student-registration-root"></div>
    </body>
</html>