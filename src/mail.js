// Outgoing e-mail. Until the team picks a provider, mails are only logged in
// development; set RESEND_API_KEY and MAIL_FROM (wrangler secrets) to send them.

export function createMailer(env) {
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    return {
      async send({ to, subject, text }) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
        });
        if (!response.ok) throw new Error(`Mail provider returned ${response.status}`);
      },
    };
  }
  return {
    // Development only: prints the mail body (with the link) but not the address.
    async send({ subject, text }) {
      console.log(`[mail not sent, no provider configured] ${subject}\n${text}`);
    },
  };
}
