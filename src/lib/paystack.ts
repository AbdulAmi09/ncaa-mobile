import { supabase } from '@/lib/supabase';

const INITIALIZE_URL = 'https://app.ncaaweb.com.ng/api/payments/initialize';

// Calls the same nigarbapp API route the web app uses, but with a bearer
// token instead of a cookie -- see the note in that route's
// getAuthedRequest() for why. The route picks the mobile Paystack
// callback_url (ncaamobile://payments/callback) automatically once it sees
// this is a bearer request, so nothing payment-specific needs to happen on
// this side beyond sending the token.
export async function initializeMobilePayment(paymentId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { authorizationUrl: null, error: 'You need to be signed in to pay.' };

  try {
    const response = await fetch(INITIALIZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    const data = await response.json();
    if (!response.ok || !data.authorization_url) {
      return { authorizationUrl: null, error: data.error || "Couldn't start this payment. Please try again." };
    }
    return { authorizationUrl: data.authorization_url as string, error: null };
  } catch {
    return { authorizationUrl: null, error: "Couldn't reach the payment server. Please try again." };
  }
}
