import { Redirect } from 'expo-router';

/** Landing route for the OAuth redirect (dinnersorted://auth-callback). The sign-in code handles the session. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
