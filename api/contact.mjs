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

    // Hidden honeypot: if filled, silently succeed to deter bots.
    if (clean(body.hp, 200)) {
      return Response.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 254);
    const enquiryType = clean(body.enquiryType, 60);
    const message = clean(body.message, 5_000);

    if (!name || !isEmail(email) || !enquiryType || !message) {
      return Response.json(
        { ok: false, error: 'Please complete required fields with a valid email address' },
        { status: 400 }
      );
    }

    const payload = {
      name,
      email,
      enquiryType,
      organisation: clean(body.organisation, 200),
      eventName: clean(body.eventName, 200),
      eventDate: clean(body.eventDate, 50),
      venue: clean(body.venue, 200),
      cityCountry: clean(body.cityCountry, 200),
      capacity: clean(body.capacity, 20),
      budget: clean(body.budget, 200),
      message,
      _subject: `0708 website: ${enquiryType}`,
      _template: 'table',
      _captcha: 'false'
    };

    const upstream = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
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

