<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signing in...</title>
    <script>
        (function() {
            const authPayload = @json($authPayload);

            if (authPayload && authPayload.token) {
                // Store authentication credentials
                localStorage.setItem('token', authPayload.token);
                localStorage.setItem('auth_token', authPayload.token);
                localStorage.setItem('user_role', authPayload.user?.role?.slug || 'admin');
                localStorage.setItem('user_name', authPayload.user?.name || '');
                localStorage.setItem('user_email', authPayload.user?.email || '');
                localStorage.setItem('user_id', authPayload.user?.id || '');

                // Forward to destination portal
                window.location.replace(authPayload.redirect || '/admin-portal');
            } else {
                window.location.replace('/login?error=oauth_token_missing');
            }
        })();
    </script>
</head>
<body style="background-color: #070D18; color: #94A3B8; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <p style="font-size: 14px;">Completing sign in...</p>
</body>
</html>