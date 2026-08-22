const CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/contact@0708.nl';
const MAX_BODY_SIZE = 20_000;
const ENQUIRY_TYPES = new Set(['booking', 'press', 'collab', 'other']);

class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readForm(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) {
    throw new RequestError('Request is too large', 413);
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      throw new RequestError('Invalid JSON body', 400);
    }
  }

  if (!contentType.includes('application/x-www-form-urlencoded')) {
    throw new RequestError('Unsupported content type', 415);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_SIZE) {
    throw new RequestError('Request is too large', 413);
  }
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(request) {
  try {
    const body = await readForm(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new RequestError('Invalid request body', 400);
    }

    // Hidden honeypot: if filled, silently succeed to deter bots.
    if (clean(body.hp, 200)) {
      return json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 254);
    const enquiryType = clean(body.enquiryType, 60);
    const message = clean(body.message, 5_000);
    const organisation = clean(body.organisation, 200);
    const eventName = clean(body.eventName, 200);
    const eventDate = clean(body.eventDate, 50);
    const venue = clean(body.venue, 200);
    const cityCountry = clean(body.cityCountry, 200);
    const capacity = clean(body.capacity, 20);
    const projectName = clean(body.projectName, 200);
    const projectType = clean(body.projectType, 60);
    const subject = clean(body.subject, 200);

    if (!name || !isEmail(email) || !ENQUIRY_TYPES.has(enquiryType) || !message) {
      return json(
        { ok: false, error: 'Please complete required fields with a valid email address' },
        400
      );
    }

    const missingEnquiryDetails =
      (enquiryType === 'booking' &&
        (!organisation || !eventName || !eventDate || !venue || !cityCountry || !capacity)) ||
      (enquiryType === 'collab' && (!projectName || !projectType)) ||
      (enquiryType === 'press' && !organisation) ||
      (enquiryType === 'other' && !subject);

    if (missingEnquiryDetails) {
      return json({ ok: false, error: 'Please complete the required enquiry details' }, 400);
    }

    const payload = {
      name,
      email,
      enquiryType,
      organisation,
      eventName,
      eventDate,
      venue,
      cityCountry,
      capacity,
      budget: clean(body.budget, 200),
      projectName,
      projectType,
      deadline: clean(body.deadline, 50),
      subject,
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

    return json({ ok: true });
  } catch (error) {
    const status = Number(error.status) || 502;
    if (status >= 500) console.error('Contact function failed:', error.message);
    return json(
      { ok: false, error: status < 500 ? error.message : 'Unable to send this message right now' },
      status
    );
  }
}
