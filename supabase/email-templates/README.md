# Supabase auth email templates

Supabase sends the sign-up confirmation and password-reset emails itself, so these live in the
Supabase dashboard (Authentication → Emails → Templates), not in code. These files are the source:
paste each one into the matching template's body when it changes. Same look as lib/email.js.

| File | Template | Subject |
|---|---|---|
| confirm-signup.html | Confirm sign up | Confirm your Personal Fin email |
| reset-password.html | Reset password | Your Personal Fin password reset code |

`{{ .Token }}` is the code the app asks for (sign-in.js → confirmWithCode / resetWithCode);
`{{ .ConfirmationURL }}` is the link, for people on the website.
