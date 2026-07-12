import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// ── Fixed QR settings ──
const QR_SIZE  = 280;
const QR_DARK  = '#0f172a';
const QR_LIGHT = '#ffffff';

function generateTicketId() {
  const seg = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${seg()}-${seg()}`;
}

export default function App() {
  // Mobile active panel state: 'quick' or 'business'
  const [activePanel, setActivePanel] = useState('quick');

  // Quick Generate panel state
  const [qrType, setQrType] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState('WPA');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventHolder, setEventHolder] = useState('');
  const [ticketId, setTicketId] = useState('');

  const [quickError, setQuickError] = useState('');
  const [quickResult, setQuickResult] = useState(null); // { data: string, summary?: object }

  // Canvas Ref for Quick Generate
  const quickCanvasRef = useRef(null);

  // Initialize ticket ID
  useEffect(() => {
    setTicketId(generateTicketId());
  }, []);

  // Clear errors and results when switching Quick QR Types
  useEffect(() => {
    setQuickError('');
    setQuickResult(null);
  }, [qrType]);

  // Business Card panel state
  const [bizName, setBizName] = useState('');
  const [bizDesc, setBizDesc] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizAddress, setBizAddress] = useState('');

  const [bizError, setBizError] = useState('');
  const [bizResult, setBizResult] = useState(null); // { qrData: string, label: string }

  // Canvas Ref for Business Card
  const bizCanvasRef = useRef(null);

  // Download helper for PNGs
  const downloadPNG = (canvasElement, filename) => {
    if (!canvasElement) return;
    const link = document.createElement('a');
    link.download = filename || 'qr-code.png';
    link.href = canvasElement.toDataURL('image/png');
    link.click();
  };

  // Quick Generate logic
  const generateQRCode = async () => {
    setQuickError('');
    setQuickResult(null);

    let data = '';
    let summary = null;

    if (qrType === 'url') {
      const url = urlInput.trim();
      if (!url) {
        setQuickError('Please enter a URL.');
        return;
      }
      try {
        new URL(url);
      } catch {
        setQuickError('Invalid URL. Include https:// e.g. https://example.com');
        return;
      }
      data = url;
    } else if (qrType === 'phone') {
      const phone = phoneInput.trim();
      if (!phone) {
        setQuickError('Please enter a phone number.');
        return;
      }
      if (!/^\+?\d{7,15}$/.test(phone)) {
        setQuickError('Invalid phone number. Digits only, e.g. +2201234567');
        return;
      }
      data = `tel:${phone}`;
    } else if (qrType === 'wifi') {
      const ssid = wifiSSID.trim();
      if (!ssid) {
        setQuickError('Please enter the network name (SSID).');
        return;
      }
      if (wifiSecurity && !wifiPassword) {
        setQuickError('Please enter the Wi-Fi password.');
        return;
      }
      data = `WIFI:T:${wifiSecurity};S:${ssid};P:${wifiPassword};;`;
    } else if (qrType === 'event') {
      const name = eventName.trim();
      const date = eventDate;
      const venue = eventVenue.trim();
      const holder = eventHolder.trim();

      if (!name) {
        setQuickError('Please enter the event name.');
        return;
      }
      if (!date) {
        setQuickError('Please select the event date and time.');
        return;
      }
      if (!venue) {
        setQuickError('Please enter the venue.');
        return;
      }

      const formatted = new Date(date).toLocaleString('en-GB', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      const lines = [
        `EVENT TICKET`,
        `────────────────────`,
        `Event : ${name}`,
        `Date  : ${formatted}`,
        `Venue : ${venue}`,
        ...(holder ? [`Name  : ${holder}`] : []),
        `ID    : ${ticketId}`,
      ];

      data = lines.join('\n');
      summary = { name, date: formatted, venue, holder, id: ticketId };
    }

    try {
      if (quickCanvasRef.current) {
        await QRCode.toCanvas(quickCanvasRef.current, data, {
          width: QR_SIZE,
          margin: 2,
          color: { dark: QR_DARK, light: QR_LIGHT },
        });

        setQuickResult({ data, summary });

        // Scroll to result smoothly
        setTimeout(() => {
          quickCanvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        if (qrType === 'event') {
          setTicketId(generateTicketId());
        }
      }
    } catch (err) {
      setQuickError('Could not generate QR code. Please check your input.');
      console.error(err);
    }
  };

  // Business Generate logic
  const generateBizQRCode = async () => {
    setBizError('');
    setBizResult(null);

    const name = bizName.trim();
    const desc = bizDesc.trim();
    const phone = bizPhone.trim();
    const email = bizEmail.trim();
    const website = bizWebsite.trim();
    const address = bizAddress.trim();

    if (!name) {
      setBizError('Business name is required.');
      return;
    }
    if (!phone && !email && !website && !address) {
      setBizError('Please provide at least one contact detail (phone, email, website, or address).');
      return;
    }

    let qrData = '';
    let label = '';

    if (website) {
      qrData = website;
      label = `Scanning will open: ${website}`;
    } else if (address) {
      qrData = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      label = `Scanning will open Google Maps for: ${address}`;
    } else {
      const vcardLines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        ...(desc ? [`NOTE:${desc}`] : []),
        ...(phone ? [`TEL:${phone}`] : []),
        ...(email ? [`EMAIL:${email}`] : []),
        'END:VCARD',
      ];
      qrData = vcardLines.join('\n');
      label = 'Scanning will save this contact to the phone.';
    }

    try {
      if (bizCanvasRef.current) {
        await QRCode.toCanvas(bizCanvasRef.current, qrData, {
          width: QR_SIZE,
          margin: 2,
          color: { dark: QR_DARK, light: QR_LIGHT },
        });

        setBizResult({ qrData, label });

        // Scroll to result smoothly
        setTimeout(() => {
          bizCanvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    } catch (err) {
      setBizError('Could not generate business QR code.');
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto w-full">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">QR Code Generator</h1>
        <p className="mt-1.5 text-sm text-slate-500">Generate QR codes for URLs, phone numbers, Wi-Fi, events, and business cards.</p>
      </header>

      {/* Mobile Tab Switcher (hidden on md+) */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1 mb-5 md:hidden" id="panel-tabs">
        <button
          className={`flex-1 text-center py-2 px-3 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all duration-200 ${activePanel === 'quick' ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
          onClick={() => setActivePanel('quick')}
        >
          ⚡ Quick Generate
        </button>
        <button
          className={`flex-1 text-center py-2 px-3 rounded-lg text-[13px] font-semibold cursor-pointer border-0 transition-all duration-200 ${activePanel === 'business' ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
          onClick={() => setActivePanel('business')}
        >
          🏢 Business Card
        </button>
      </div>

      {/* Panels */}
      <div className="flex flex-col md:flex-row md:items-start gap-5">

        {/* ── Panel 1: Quick Generate ── */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:flex-1 md:min-w-0 transition-all duration-200 ${activePanel === 'quick' ? 'block' : 'hidden md:block'}`} id="panel-quick">
          <h2 className="text-lg font-bold text-slate-900 mb-1">⚡ Quick Generate</h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">Generate QR codes for URLs, phone numbers, Wi-Fi networks, and event tickets.</p>

          {/* QR Type */}
          <div className="mb-5">
            <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="qr-type">QR Type</label>
            <select
              id="qr-type"
              className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
              value={qrType}
              onChange={(e) => setQrType(e.target.value)}
            >
              <option value="url">URL</option>
              <option value="phone">Phone Number</option>
              <option value="wifi">Wi-Fi</option>
              <option value="event">Event Ticket</option>
            </select>
          </div>

          {/* ── URL Section ── */}
          {qrType === 'url' && (
            <div id="section-url" className="space-y-[14px]">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="url-input">Website URL</label>
                <input
                  id="url-input"
                  type="url"
                  className="font-mono w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
            </div>
          )}

          {/* ── Phone Section ── */}
          {qrType === 'phone' && (
            <div id="section-phone" className="space-y-[14px]">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="phone-input">Phone Number</label>
                <input
                  id="phone-input"
                  type="tel"
                  className="font-mono w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="+2201234567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
                <p className="text-[11px] text-slate-400 mt-1">Include country code, e.g. +220 for Gambia.</p>
              </div>
            </div>
          )}

          {/* ── Wi-Fi Section ── */}
          {qrType === 'wifi' && (
            <div id="section-wifi" className="space-y-[14px]">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="wifi-ssid">Network Name (SSID)</label>
                <input
                  id="wifi-ssid"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="MyHomeNetwork"
                  value={wifiSSID}
                  onChange={(e) => setWifiSSID(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="wifi-password">Password</label>
                <div className="relative">
                  <input
                    id="wifi-password"
                    type={showWifiPassword ? 'text' : 'password'}
                    className="w-full border border-slate-300 rounded-lg py-2 pl-3 pr-12 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                    placeholder="Enter Wi-Fi password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                  />
                  <button
                    type="button"
                    id="toggle-pw"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 bg-transparent border-0 cursor-pointer hover:text-slate-600"
                    onClick={() => setShowWifiPassword(!showWifiPassword)}
                  >
                    {showWifiPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="wifi-security">Security Type</label>
                <select
                  id="wifi-security"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  value={wifiSecurity}
                  onChange={(e) => setWifiSecurity(e.target.value)}
                >
                  <option value="WPA">WPA / WPA2 (most common)</option>
                  <option value="WEP">WEP</option>
                  <option value="">None (Open network)</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Event Ticket Section ── */}
          {qrType === 'event' && (
            <div id="section-event" className="space-y-[14px]">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="event-name">Event Name</label>
                <input
                  id="event-name"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="e.g. Independence Day Concert"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="event-date">Date &amp; Time</label>
                <input
                  id="event-date"
                  type="datetime-local"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-905 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="event-venue">Venue</label>
                <input
                  id="event-venue"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="e.g. Independence Stadium, Banjul"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="event-holder">Ticket Holder <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  id="event-holder"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  placeholder="Full name of attendee"
                  value={eventHolder}
                  onChange={(e) => setEventHolder(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') generateQRCode(); }}
                />
              </div>
              {/* Ticket ID badge */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ticket ID</p>
                  <p id="ticket-id" className="font-mono text-[13px] font-semibold text-slate-900 mt-0.5">{ticketId || '—'}</p>
                </div>
                <button
                  type="button"
                  id="regen-ticket"
                  className="text-xs font-medium text-emerald-500 bg-transparent border-0 cursor-pointer hover:text-emerald-600"
                  onClick={() => setTicketId(generateTicketId())}
                >
                  ↻ New ID
                </button>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            id="generate-btn"
            className="w-full border-0 rounded-lg py-[11px] px-4 text-sm font-semibold cursor-pointer transition-all duration-100 active:scale-[0.98] bg-slate-900 text-white mt-5 hover:bg-slate-800"
            onClick={generateQRCode}
          >
            Generate QR Code
          </button>

          {/* Error */}
          {quickError && (
            <p id="error-msg" className="text-xs text-red-500 mt-2">
              {quickError}
            </p>
          )}

          {/* Result */}
          <div id="result" className={`flex-col items-center mt-6 ${quickResult ? 'flex' : 'hidden'}`}>
            {quickResult?.summary && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-[10px] py-3 px-4 text-[13px] text-emerald-800 mb-3.5 leading-[1.7]">
                <p className="font-semibold text-emerald-850">{quickResult.summary.name}</p>
                <p>📅 {quickResult.summary.date}</p>
                <p>📍 {quickResult.summary.venue}</p>
                {quickResult.summary.holder && <p>👤 {quickResult.summary.holder}</p>}
                <p className="font-mono text-[11px] mt-1 text-emerald-600">
                  🎫 {quickResult.summary.id}
                </p>
              </div>
            )}
            <canvas ref={quickCanvasRef} id="qr-canvas" className="rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.1)] max-w-full"></canvas>
            <button
              id="download-btn"
              className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg py-2 px-3.5 text-[13px] font-medium text-slate-700 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 mt-3"
              onClick={() => downloadPNG(quickCanvasRef.current, 'qr-code.png')}
            >
              ⬇ Download PNG
            </button>
          </div>
        </div>

        {/* ── Panel 2: Business Card QR ── */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:flex-1 md:min-w-0 transition-all duration-200 ${activePanel === 'business' ? 'block' : 'hidden md:block'}`} id="panel-business">
          <h2 className="text-lg font-bold text-slate-900 mb-1">🏢 Business Card QR</h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Fill in your business details. When scanned, the QR code will open your website or show your address on the
            map — and allow saving your contact info instantly.
          </p>

          <form id="business-form" className="space-y-[14px]" onSubmit={(e) => { e.preventDefault(); generateBizQRCode(); }}>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-name">Business Name</label>
              <input
                id="biz-name"
                type="text"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="e.g. Ebrima's Tech Solution"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-desc">Business Description</label>
              <textarea
                id="biz-desc"
                rows="2"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="e.g. Software development & IT consulting firm based in Banjul"
                value={bizDesc}
                onChange={(e) => setBizDesc(e.target.value)}
              ></textarea>
              <p className="text-[11px] text-slate-400 mt-1">A brief, accurate description of what your business does.</p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-phone">Phone Number</label>
              <input
                id="biz-phone"
                type="tel"
                className="font-mono w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-905 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="e.g. +2201234567"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-email">Email Address</label>
              <input
                id="biz-email"
                type="email"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="e.g. ebrima@yourbusiness.com"
                value={bizEmail}
                onChange={(e) => setBizEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-website">Website URL</label>
              <input
                id="biz-website"
                type="url"
                className="font-mono w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="https://yourbusiness.com"
                value={bizWebsite}
                onChange={(e) => setBizWebsite(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">If provided, scanning will open this page directly.</p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1" htmlFor="biz-address">Business Address</label>
              <input
                id="biz-address"
                type="text"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-900 bg-white outline-none transition-all duration-150 resize-none focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                placeholder="e.g. 14 Kairaba Avenue, Bakau, Gambia"
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">If no website is set, scanning will open this address on Google Maps.</p>
            </div>

            {/* Business error */}
            {bizError && (
              <p id="biz-error" className="text-xs text-red-500 mt-2">
                {bizError}
              </p>
            )}

            <button type="submit" id="biz-generate" className="w-full border-0 rounded-lg py-[11px] px-4 text-sm font-semibold cursor-pointer transition-all duration-100 active:scale-[0.98] bg-emerald-500 text-white mt-5 hover:bg-emerald-600">
              Generate Business QR
            </button>
          </form>

          {/* Business QR Result */}
          <div id="biz-result" className={`flex-col items-center mt-6 ${bizResult ? 'flex' : 'hidden'}`}>
            <p id="biz-qr-label" className="text-xs text-slate-500 text-center mb-2.5">
              {bizResult?.label}
            </p>
            <canvas ref={bizCanvasRef} id="biz-canvas" className="rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.1)] max-w-full"></canvas>
            <button
              id="biz-download"
              className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg py-2 px-3.5 text-[13px] font-medium text-slate-700 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 mt-3"
              onClick={() => downloadPNG(bizCanvasRef.current, 'business-qr.png')}
            >
              ⬇ Download PNG
            </button>
          </div>
        </div>

      </div>{/* /.panels-wrapper */}

      {/* Footer */}
      <p className="text-center mt-10 text-xs text-slate-400">Made by <span className="text-emerald-500 font-semibold">Ebrima</span> · QR Code Generator</p>
    </div>
  )
}
