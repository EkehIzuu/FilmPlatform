export function isEmailNotConfirmedError(message: string): boolean {
  return /email not confirmed/i.test(message);
}

export function formatAuthError(message: string): string {
  if (isEmailNotConfirmedError(message)) {
    return "Email not confirmed. Check your inbox for the signup link, or run supabase/006_confirm_user_email.sql in the SQL Editor.";
  }
  return message;
}
