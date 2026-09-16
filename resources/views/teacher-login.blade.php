<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In &bull; Teacher Portal &bull; {{ config('app.name', 'SMS') }}</title>
    <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
    <link rel="apple-touch-icon" href="{{ asset('logo.png') }}">

    <script>
        if (
            localStorage.getItem('theme') === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/TeacherLogin.jsx'])
</head>
    <body class="bg-slate-950 text-slate-100 antialiased">
        <div id="teacher-login-root"></div>
    </body>
</html>
