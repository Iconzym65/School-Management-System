<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to SHS Vacation Classes</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Base Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        
        /* Mobile Adaptations */
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .mobile-p-20 { padding-left: 20px !important; padding-right: 20px !important; }
            .mobile-stack { display: block !important; width: 100% !important; }
            .action-button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b;">

    <!-- Preview Text / Preheader -->
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
        Welcome to SHS Vacation Classes. Your {{ strtolower($roleName) }} account has been successfully provisioned. Here are your access details.
    </div>

    <!-- Wrapper Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 16px;">

                <!-- Container 600px -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                    
                    <!-- Header Section with Navy Branding -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 32px 36px; text-align: left; border-bottom: 4px solid #2563eb;" class="mobile-p-20">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="display: inline-block; background-color: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 4px 10px; margin-bottom: 12px;">
                                            <span style="color: #60a5fa; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">SHS Vacation Classes</span>
                                        </div>
                                        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; line-height: 28px; margin: 0; letter-spacing: -0.02em;">
                                            Academic Excellence Portal
                                        </h1>
                                        <p style="color: #94a3b8; font-size: 13px; line-height: 18px; margin: 4px 0 0 0;">
                                            Account Provisioning &amp; Access Credentials
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 36px 24px 36px;" class="mobile-p-20">
                            
                            <!-- Greeting & Intro -->
                            <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
                                Hello, {{ $name }}
                            </h2>
                            <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                                An official <strong style="color: #0f172a;">{{ $roleName }}</strong> profile has been provisioned for you in the <strong style="color: #0f172a;">SHS Vacation Classes</strong> academic management system. Please find your login credentials and portal access link below.
                            </p>

                            <!-- Account Details Table Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px;">
                                    Account Profile Overview
                                </div>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding: 6px 0; width: 40%; color: #64748b; font-size: 13px; font-weight: 500;">Assigned Role:</td>
                                        <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">
                                            <span style="display: inline-block; background-color: {{ $isTeacher ? '#ede9fe' : '#e0f2fe' }}; color: {{ $isTeacher ? '#6d28d9' : '#0369a1' }}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">
                                                {{ $roleName }}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 500;">{{ $identifierLabel }}:</td>
                                        <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 700; font-family: 'SFMono-Regular', Consolas, Menlo, monospace;">
                                            {{ $identifierValue }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 500;">Account Email:</td>
                                        <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">
                                            {{ $email }}
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Credentials Block -->
                            @if($hasTemporaryPassword)
                                <!-- Temporary Password Card -->
                                <div style="background-color: #0f172a; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; text-align: center;">
                                    <div style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                                        Your Temporary Access Password
                                    </div>
                                    <div style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: 2px; padding: 6px 14px; background-color: #1e293b; border-radius: 6px; border: 1px solid #334155; margin: 4px 0;">
                                        {{ $temporaryPassword }}
                                    </div>
                                </div>

                                <!-- Mandatory Password Change Security Alert -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 28px;">
                                    <tr>
                                        <td style="padding: 14px 18px;">
                                            <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
                                                &#9888; Password Change Required Upon First Login
                                            </div>
                                            <div style="font-size: 13px; line-height: 20px; color: #b45309;">
                                                For account security, you are required to change this temporary password immediately after signing in. Please prepare a strong, confidential password with at least 8 characters.
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            @else
                                <!-- Google OAuth / Single Sign-On Info Card -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 6px; margin-bottom: 28px;">
                                    <tr>
                                        <td style="padding: 14px 18px;">
                                            <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
                                                Google Single Sign-On (OAuth) Enabled
                                            </div>
                                            <div style="font-size: 13px; line-height: 20px; color: #1d4ed8;">
                                                No temporary password was generated for your account. Please access the portal using your registered Google account (<strong style="color: #1e3a8a;">{{ $email }}</strong>) by clicking the button below and choosing <em>"Sign in with Google"</em>.
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            <!-- Action Button Section -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                                                    <a href="{{ $loginUrl }}" target="_blank" class="action-button" style="font-size: 15px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none; color: #ffffff; background-color: #2563eb; border: 1px solid #2563eb; border-radius: 8px; padding: 14px 32px; display: inline-block; mso-padding-alt: 0; text-align: center;">
                                                        <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt">&nbsp;</i><![endif]-->
                                                        <span style="mso-text-raise: 15pt;">Sign In to {{ $roleName }} Portal &rarr;</span>
                                                        <!--[if mso]><i style="letter-spacing: 25px; mso-font-width: -100%">&nbsp;</i><![endif]-->
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Fallback Link -->
                            <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0 0 24px 0; text-align: center;">
                                Having trouble with the button? Copy and paste this URL into your browser:<br>
                                <a href="{{ $loginUrl }}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">{{ $loginUrl }}</a>
                            </p>

                            <!-- Security Advisory -->
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0;">
                                    <strong style="color: #475569;">Security Tip:</strong> Never share your temporary password or {{ strtolower($identifierLabel) }} with anyone. School staff will never ask for your password. If you did not request or expect this account, please immediately contact the school IT office at <a href="mailto:{{ $supportEmail }}" style="color: #2563eb; text-decoration: underline;">{{ $supportEmail }}</a>.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f1f5f9; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;" class="mobile-p-20">
                            <p style="color: #475569; font-size: 12px; font-weight: 600; margin: 0 0 6px 0;">
                                SHS Vacation Classes &bull; Academic Portal
                            </p>
                            <p style="color: #94a3b8; font-size: 11px; line-height: 16px; margin: 0;">
                                &copy; {{ date('Y') }} SHS Vacation Classes. All rights reserved.<br>
                                This is an automated communication sent from a notification-only address. Please do not reply directly.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
