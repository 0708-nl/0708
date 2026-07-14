const CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/contact@0708.nl';
const MAX_BODY_SIZE = 20_000;

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readForm(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) return null;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  const text = await request.text();
  if (text.length > MAX_BODY_SIZE) return null;
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(request) {
  try {
    const body = await readForm(request);
    if (!body) {
      return Response.json({ ok: false, error: 'Request is too large' }, { status: 413 });
    }

    // Hidden honeypot: bots fill it, people never see it.
    if (clean(body.company, 200)) {
      return Response.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 254);
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 5_000);

    if (!name || !isEmail(email) || !subject || !message) {
      return Response.json(
        { ok: false, error: 'Please complete every field with a valid email address' },
        { status: 400 }
      );
    }

    const upstream = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        _subject: `0708 website: ${subject}`,
        _template: 'table',
        _captcha: 'false'
      }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!upstream.ok) {
      throw new Error(`FormSubmit returned ${upstream.status}`);
    }

    return Response.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Contact function failed:', error.message);
    return Response.json(
      { ok: false, error: 'Unable to send this message right now' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

