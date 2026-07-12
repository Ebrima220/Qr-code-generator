import QRCode from 'qrcode';

// ── Fixed QR settings ──
const QR_SIZE  = 280;
const QR_DARK  = '#0f172a';
const QR_LIGHT = '#ffffff';

// ── Panel tab switching (mobile only) ──
window.switchPanel = function(which) {
  const panelQuick    = document.getElementById('panel-quick');
  const panelBusiness = document.getElementById('panel-business');
  const tabQuick      = document.getElementById('tab-quick');
  const tabBusiness   = document.getElementById('tab-business');

  if (which === 'quick') {
    panelQuick.classList.remove('panel-hidden');
    panelBusiness.classList.add('panel-hidden');
    tabQuick.classList.add('active');
    tabBusiness.classList.remove('active');
  } else {
    panelBusiness.classList.remove('panel-hidden');
    panelQuick.classList.add('panel-hidden');
    tabBusiness.classList.add('active');
    tabQuick.classList.remove('active');
  }
};

// ── DOM references ──
const qrType      = document.getElementById('qr-type');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const canvas      = document.getElementById('qr-canvas');
const resultBox   = document.getElementById('result');
const errorMsg    = document.getElementById('error-msg');
const ticketSummary = document.getElementById('ticket-summary');

// Section panels
const sections = {
  url:   document.getElementById('section-url'),
  phone: document.getElementById('section-phone'),
  wifi:  document.getElementById('section-wifi'),
  event: document.getElementById('section-event'),
};

// Business form
const bizGenerate = document.getElementById('biz-generate');
const bizCanvas   = document.getElementById('biz-canvas');
const bizResult   = document.getElementById('biz-result');
const bizError    = document.getElementById('biz-error');
const bizDownload = document.getElementById('biz-download');
const bizQrLabel  = document.getElementById('biz-qr-label');

// ── Ticket ID ──
let currentTicketId = generateTicketId();

function generateTicketId() {
  const seg = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${seg()}-${seg()}`;
}

function refreshTicketId() {
  currentTicketId = generateTicketId();
  document.getElementById('ticket-id').textContent = currentTicketId;
}

document.getElementById('ticket-id').textContent = currentTicketId;
document.getElementById('regen-ticket').addEventListener('click', refreshTicketId);

// ── Wi-Fi password toggle ──
const togglePw    = document.getElementById('toggle-pw');
const wifiPwField = document.getElementById('wifi-password');
togglePw.addEventListener('click', () => {
  const isHidden = wifiPwField.type === 'password';
  wifiPwField.type = isHidden ? 'text' : 'password';
  togglePw.textContent = isHidden ? 'Hide' : 'Show';
});

// ── Error helpers ──
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');
}

// ── Section switching ──
function switchSection(type) {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== type);
  });
  clearError();
  resultBox.classList.remove('visible');
  ticketSummary.classList.remove('visible');
}

qrType.addEventListener('change', () => switchSection(qrType.value));

// ── Build QR data per type ──
function buildQRData() {
  const type = qrType.value;

  switch (type) {

    case 'url': {
      const url = document.getElementById('url-input').value.trim();
      if (!url) { showError('Please enter a URL.'); return null; }
      try { new URL(url); } catch {
        showError('Invalid URL. Include https:// e.g. https://example.com');
        return null;
      }
      return { data: url };
    }

    case 'phone': {
      const phone = document.getElementById('phone-input').value.trim();
      if (!phone) { showError('Please enter a phone number.'); return null; }
      if (!/^\+?\d{7,15}$/.test(phone)) {
        showError('Invalid phone number. Digits only, e.g. +2201234567');
        return null;
      }
      return { data: `tel:${phone}` };
    }

    case 'wifi': {
      const ssid     = document.getElementById('wifi-ssid').value.trim();
      const password = document.getElementById('wifi-password').value;
      const security = document.getElementById('wifi-security').value;

      if (!ssid)              { showError('Please enter the network name (SSID).'); return null; }
      if (security && !password) { showError('Please enter the Wi-Fi password.'); return null; }

      const data = `WIFI:T:${security};S:${ssid};P:${password};;`;
      return { data };
    }

    case 'event': {
      const name   = document.getElementById('event-name').value.trim();
      const date   = document.getElementById('event-date').value;
      const venue  = document.getElementById('event-venue').value.trim();
      const holder = document.getElementById('event-holder').value.trim();

      if (!name)  { showError('Please enter the event name.'); return null; }
      if (!date)  { showError('Please select the event date and time.'); return null; }
      if (!venue) { showError('Please enter the venue.'); return null; }

      const formatted = new Date(date).toLocaleString('en-GB', {
        dateStyle: 'long', timeStyle: 'short',
      });

      const lines = [
        `EVENT TICKET`,
        `────────────────────`,
        `Event : ${name}`,
        `Date  : ${formatted}`,
        `Venue : ${venue}`,
        ...(holder ? [`Name  : ${holder}`] : []),
        `ID    : ${currentTicketId}`,
      ];

      return {
        data: lines.join('\n'),
        summary: { name, date: formatted, venue, holder, id: currentTicketId },
      };
    }

    default:
      return null;
  }
}

// ── Main QR generation ──
async function generateQRCode() {
  clearError();
  ticketSummary.classList.remove('visible');

  const result = buildQRData();
  if (!result) {
    resultBox.classList.remove('visible');
    return;
  }

  try {
    await QRCode.toCanvas(canvas, result.data, {
      width:  QR_SIZE,
      margin: 2,
      color:  { dark: QR_DARK, light: QR_LIGHT },
    });

    if (result.summary) {
      const s = result.summary;
      ticketSummary.innerHTML = `
        <p style="font-weight:600;color:#065f46">${s.name}</p>
        <p>📅 ${s.date}</p>
        <p>📍 ${s.venue}</p>
        ${s.holder ? `<p>👤 ${s.holder}</p>` : ''}
        <p style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;margin-top:4px;color:#059669">🎫 ${s.id}</p>
      `;
      ticketSummary.classList.add('visible');
    }

    resultBox.classList.add('visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (qrType.value === 'event') refreshTicketId();

  } catch (err) {
    showError('Could not generate QR code. Please check your input.');
    resultBox.classList.remove('visible');
    console.error(err);
  }
}

function downloadPNG(sourceCanvas, filename) {
  const link    = document.createElement('a');
  link.download = filename || 'qr-code.png';
  link.href     = sourceCanvas.toDataURL('image/png');
  link.click();
}

// ── Event listeners ──
generateBtn.addEventListener('click', generateQRCode);
document.getElementById('url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateQRCode();
});

downloadBtn.addEventListener('click', () => downloadPNG(canvas, 'qr-code.png'));

// ── Business QR ──
bizGenerate.addEventListener('click', async () => {
  bizError.classList.add('hidden');
  bizResult.classList.remove('visible');

  const name    = document.getElementById('biz-name').value.trim();
  const desc    = document.getElementById('biz-desc').value.trim();
  const phone   = document.getElementById('biz-phone').value.trim();
  const email   = document.getElementById('biz-email').value.trim();
  const website = document.getElementById('biz-website').value.trim();
  const address = document.getElementById('biz-address').value.trim();

  if (!name) {
    bizError.textContent = 'Business name is required.';
    bizError.classList.remove('hidden');
    return;
  }
  if (!phone && !email && !website && !address) {
    bizError.textContent = 'Please provide at least one contact detail (phone, email, website, or address).';
    bizError.classList.remove('hidden');
    return;
  }

  let qrData;
  let labelText;

  if (website) {
    qrData    = website;
    labelText = `Scanning will open: ${website}`;
  } else if (address) {
    qrData    = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    labelText = `Scanning will open Google Maps for: ${address}`;
  } else {
    const vcardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      ...(desc    ? [`NOTE:${desc}`]   : []),
      ...(phone   ? [`TEL:${phone}`]   : []),
      ...(email   ? [`EMAIL:${email}`] : []),
      'END:VCARD',
    ];
    qrData    = vcardLines.join('\n');
    labelText = 'Scanning will save this contact to the phone.';
  }

  try {
    await QRCode.toCanvas(bizCanvas, qrData, {
      width:  QR_SIZE,
      margin: 2,
      color:  { dark: QR_DARK, light: QR_LIGHT },
    });

    bizQrLabel.textContent = labelText;
    bizResult.classList.add('visible');
    bizResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    bizError.textContent = 'Could not generate business QR code.';
    bizError.classList.remove('hidden');
    console.error(err);
  }
});

bizDownload.addEventListener('click', () => downloadPNG(bizCanvas, 'business-qr.png'));