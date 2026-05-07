# End-to-End Test Report: cuan.vixyo.id

**Test Date:** 2026-05-05
**Tester:** E2E Automated Test Suite
**Scope:** Full site crawl, link validation, asset verification, security header review, API health checks, and user flow analysis.
**Methodology:** Server-side HTTP testing using PowerShell `Invoke-WebRequest`. JavaScript execution and visual rendering were not tested (no browser automation available).

---

## Executive Summary

The website `https://cuan.vixyo.id` is a **Next.js single-page application (SPA)** serving as a marketing/landing site for a QRIS agent recruitment program ("vixyo"). The site loads quickly and has good baseline security headers, but suffers from a **critical server configuration issue** where all missing assets and non-existent pages return HTTP 200 with the homepage HTML instead of proper 404 responses. Additionally, a **broken external link** and a **staging backoffice link exposed in production** were discovered.

| Category | Grade | Notes |
|----------|-------|-------|
| Uptime / Availability | ✅ PASS | Site is reachable and responsive. |
| Core Pages | ✅ PASS | Primary marketing pages exist and load. |
| Static Assets (JS/CSS) | ✅ PASS | Next.js build chunks load correctly. |
| Broken Links | ❌ FAIL | 1 broken external link + staging env leak. |
| 404 Handling | ❌ FAIL | All 404s return 200 + HTML. Major SEO issue. |
| SEO / Meta Tags | ⚠️ WARN | Duplicate titles across most pages. |
| Security Headers | ✅ PASS | HSTS, CSP, X-Frame-Options present. |
| SSL/TLS | ✅ PASS | Valid Let's Encrypt cert (55 days remaining). |
| API Health | ✅ PASS | `/api/health` returns healthy JSON. |
| Auth Flows | ❌ FAIL | Auth routes exist but serve homepage HTML with no forms. |

---

## 1. Pages Tested & Status

### Verified Pages (200 OK)

| Path | Status | Title (Server-Side Rendered) | Size | Notes |
|------|--------|------------------------------|------|-------|
| `/` | ✅ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Homepage loads correctly. |
| `/panduan` | ✅ 200 | `Playbook — vixyo` | ~35 KB | Has unique title. Links to sub-pages. |
| `/panduan/agent` | ⚠️ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | ~35 KB | **Same title as homepage.** |
| `/panduan/store` | ⚠️ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | ~35 KB | **Same title as homepage.** Links to staging backoffice. |
| `/panduan/agent/presentation` | ⚠️ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | ~35 KB | **Same title as homepage.** |
| `/tanya-ai` | ⚠️ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 23,702 B | AI chat page. No `<input>`/`<textarea>` in SSR HTML (JS-rendered). |
| `/merchant` | ✅ 200 | `Halaman Merchant Segera Hadir — vixyo` | 22,127 B | "Coming Soon" placeholder page. Has unique title. |
| `/login` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | **No login form.** Returns homepage HTML. |
| `/register` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | **No register form.** Returns homepage HTML. |
| `/dashboard` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/admin` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/about` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/contact` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/terms` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/privacy` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/daftar` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/masuk` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/settings` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/profile` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/agent` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |
| `/store` | ❌ 200 | `vixyo — Jadi Agen QRIS, Cuan Tiap Bulan` | 35,012 B | Returns homepage HTML. |

### Verified 404s

| Path | Status | Notes |
|------|--------|-------|
| `/api` | ❌ 404 | Expected (no root API handler). |
| `/api/status` | ❌ 404 | Expected. |
| `/api/v1` | ❌ 404 | Expected. |
| `/api/users` | ❌ 404 | Expected. |
| `/api/auth` | ❌ 404 | Expected. |
| `/this-page-definitely-does-not-exist-12345` | ⚠️ **200** | **Returns homepage HTML with 200 status. Bad.** |

---

## 2. Asset Verification

### Static Assets (JS / CSS) — PASS

| Asset | Status | Content-Type | Size | Result |
|-------|--------|--------------|------|--------|
| `/_next/static/css/6753592127cf16c1.css` | ✅ 200 | `text/css` | 62,561 B | Loads correctly. |
| `/_next/static/chunks/main-app-093be816f9c6fdbf.js` | ✅ 200 | `application/javascript` | 557 B | Loads correctly. |
| `/_next/static/chunks/4bd1b696-c023c6e3521b1417.js` | ✅ 200 | (verified) | — | Loads correctly. |

### Image Assets — MIXED

| Asset | Status | Content-Type | Size | Result |
|-------|--------|--------------|------|--------|
| `/og-image.png` | ✅ 200 | `image/png` | 1,616 B | Valid Open Graph image. |

### Favicon / Manifest — **CRITICAL FAIL**

Every favicon and manifest request returns **HTTP 200 with the homepage HTML** (35,012 bytes) instead of the actual file or a 404. This indicates a misconfigured catch-all route in nginx/Next.js that serves `index.html` for **all** requests.

| Asset | Expected | Actual | Result |
|-------|----------|--------|--------|
| `/favicon.ico` | `image/x-icon` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/apple-touch-icon.png` | `image/png` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/favicon-32x32.png` | `image/png` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/favicon-16x16.png` | `image/png` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/site.webmanifest` | `application/manifest+json` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/manifest.json` | `application/json` or 404 | `text/html` (35,012 B) | ❌ **FAIL** |
| `/_next/static/media/` | `text/html` (directory) or 404 | `text/html` (35,012 B) | ❌ **FAIL** |

**Impact:**
- Browsers cannot load favicons or PWA manifests.
- Search engines may index non-existent URLs as duplicate content.
- PWA installation will fail.
- Wasted bandwidth (35 KB of HTML served for every missing asset).

---

## 3. Broken Links & External References

### Broken External Link — HIGH PRIORITY

| Source Page | Broken Link | Error |
|-------------|-------------|-------|
| `/panduan/store` | `https://vixyo.id/bicara` | **404 Not Found** |
| `/panduan/agent` | `https://vixyo.id/bicara` | **404 Not Found** |

**Recommendation:** Update or remove the broken `vixyo.id/bicara` link.

### Staging Environment Exposed — HIGH PRIORITY

| Source Page | Link | Status | Issue |
|-------------|------|--------|-------|
| `/panduan/store` | `https://stg-backoffice.vixyo.id` | ✅ 200 | **Staging backoffice linked from production.** |

**Impact:**
- Users may accidentally register/log in to a staging environment.
- Staging environments often have weaker security, test data, or debugging enabled.
- Creates confusion between production and staging URLs.

**Recommendation:** Replace with the production backoffice URL or remove the link until production backoffice is ready.

---

## 4. API & Backend Tests

### Health Check Endpoint

| Endpoint | Method | Status | Response | Result |
|----------|--------|--------|----------|--------|
| `/api/health` | GET | ✅ 200 | `{"success":true,"data":{"db":"ok"},"error":null}` | Healthy |
| `/api/health` | POST | ❌ 404 | — | Expected (GET only). |

**Note:** No CORS headers are present on the API response. This is acceptable for same-origin requests but will block cross-origin API calls if needed in the future.

---

## 5. Security Review

### Positive Findings

| Header | Value | Grade |
|--------|-------|-------|
| `Strict-Transport-Security` | `max-age=...` | ✅ HSTS enabled |
| `X-Frame-Options` | `DENY` | ✅ Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | ✅ MIME-sniffing protection |
| `Content-Security-Policy-Report-Only` | Present | ✅ CSP monitoring active |
| `Referrer-Policy` | `strict-origin...` | ✅ Referrer leakage protection |
| `Permissions-Policy` | Present | ✅ Feature policy set |

### SSL/TLS Certificate

| Property | Value |
|----------|-------|
| Subject | `CN=cuan.vixyo.id` |
| Issuer | Let's Encrypt (E8) |
| Valid From | 2026-03-31 |
| Valid To | 2026-06-29 |
| Days Remaining | **55 days** |

**Recommendation:** Schedule auto-renewal or manual renewal within the next 2–3 weeks to avoid expiry.

### Concerns

1. **No WAF / Input Sanitization Observed:**
   - Requests with XSS payloads in query strings (e.g., `?x=<script>`) returned 200 without being blocked.
   - This is typical for static SPAs but should be monitored if dynamic endpoints are added.

2. **Path Traversal Accepted:**
   - `/panduan/../admin` returned 200. The server normalizes the path but does not reject suspicious patterns.

---

## 6. SEO & Performance

### Performance

| Metric | Value |
|--------|-------|
| Average TTFB (3 samples) | ~248 ms |
| First Request | ~400 ms |
| Cached Requests | ~160–180 ms |
| Content Size (homepage) | 35,012 bytes (compressed HTML) |

**Grade:** ✅ Good — sub-300ms response times are acceptable.

### SEO Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Duplicate `<title>` tags** | 🔴 High | 14+ pages share the exact same title as the homepage. Only `/panduan` and `/merchant` have unique titles. |
| **Missing `Content-Type` charset** | 🟡 Medium | HTTP header is `text/html` without `charset=utf-8`. Browsers must sniff or rely on `<meta charset>`. |
| **No 404 status codes** | 🔴 High | Every missing page returns 200. Search engines will index non-existent URLs as duplicate content. |
| **Missing favicons** | 🟡 Medium | All favicon requests return HTML. Browsers show default icons. |
| **robots.txt** | ✅ Good | Present, allows all crawlers (including AI bots), references sitemap. |
| **sitemap.xml** | ✅ Good | Present. Contains 3 URLs: `/`, `/panduan`, `/merchant`. |

**Recommendation:** Add unique `<title>` and `<meta name="description">` tags for every page. Implement proper HTTP 404 responses for missing pages and assets.

---

## 7. User Flows & Functionality

### Marketing Flow (Homepage → Panduan → Agent/Store)

1. ✅ User lands on `/` — page loads, content readable.
2. ✅ User navigates to `/panduan` — loads, unique title.
3. ✅ User navigates to `/panduan/agent` — loads, anchor links present (`#cara-rekrut`, `#komisi`, etc.).
4. ✅ User navigates to `/panduan/store` — loads, anchor links present (`#qris`, `#biaya`, etc.).
5. ❌ User clicks "vixyo.id/bicara" link — **404 error**.
6. ⚠️ User clicks "stg-backoffice.vixyo.id" link — reaches staging environment.

### AI Chat Flow (`/tanya-ai`)

1. ✅ Page loads (200).
2. ⚠️ Static HTML contains references to "chat" and "AI" but **no `<input>` or `<textarea>` elements** in the server-rendered markup.
3. ⚠️ The chat interface is likely rendered entirely client-side via JavaScript. Without a browser, the functionality could not be tested.

### Authentication Flows

1. ❌ `/login`, `/register`, `/masuk`, `/daftar` all return the homepage HTML.
2. ❌ No login forms, email fields, or password fields exist in the static HTML for these routes.
3. ❌ There is no visible authentication UI.

**Hypothesis:** The site is currently a **static marketing site only**. Authentication and backoffice functionality may be handled entirely on `vixyo.id` or `stg-backoffice.vixyo.id`.

---

## 8. Console Errors & Anomalies

> **Note:** JavaScript execution was not performed. Console errors, runtime exceptions, and client-side rendering bugs could not be captured.

### Server-Side Anomalies

| Anomaly | Location | Description |
|---------|----------|-------------|
| **SPA Fallback Overreach** | Global | All unmatched routes and static assets return the Next.js `index.html` with HTTP 200. |
| **Staging Link in Production** | `/panduan/store` | Link to `stg-backoffice.vixyo.id` exposed to public users. |
| **Broken External Link** | `/panduan/store`, `/panduan/agent` | `https://vixyo.id/bicara` is 404. |
| **Auth Route Placeholders** | `/login`, `/register`, etc. | Routes exist but serve homepage content. May confuse users and search engines. |

---

## 9. Recommendations

### 🔴 Critical (Fix Immediately)

1. **Fix 404 Handling & Asset Routing**
   - Configure the reverse proxy (nginx) or Next.js `rewrites`/`headers` to return **HTTP 404** for unmatched routes and missing static files.
   - Ensure `favicon.ico`, `manifest.json`, `*.png` assets, and unknown paths do **not** fall back to `index.html`.
   - Example nginx fix:
     ```nginx
     location / {
       try_files $uri $uri.html $uri/ =404;
     }
     location /_next/ {
       try_files $uri =404;
     }
     ```

2. **Remove or Fix Broken External Link**
   - Update `https://vixyo.id/bicara` to the correct URL or remove the link.

3. **Replace Staging Link with Production URL**
   - Change `stg-backoffice.vixyo.id` to the production backoffice domain.

### 🟡 High Priority (Fix Soon)

4. **Add Unique Page Titles & Meta Descriptions**
   - `/panduan/agent` → "Panduan Agen — vixyo"
   - `/panduan/store` → "Panduan Merchant — vixyo"
   - `/tanya-ai` → "Tanya AI — vixyo"
   - `/login` → "Masuk — vixyo" (or remove/redirect the route if unused)
   - etc.

5. **Add `charset=utf-8` to HTTP `Content-Type` Header**
   - Ensure the server sends `Content-Type: text/html; charset=utf-8`.

6. **Create Actual Auth Pages or Redirects**
   - If `/login` and `/register` are not implemented, either build the pages or return 404/redirect to the actual auth domain.

### 🟢 Medium Priority (Nice to Have)

7. **Add Favicon Assets**
   - Create and deploy proper `favicon.ico`, `apple-touch-icon.png`, and `site.webmanifest` files.

8. **Renew SSL Certificate**
   - Let's Encrypt cert expires in 55 days. Ensure auto-renewal is active.

9. **Consider Adding Analytics**
   - No tracking scripts were detected. If analytics are desired, add Google Analytics 4, Plausible, or similar.

10. **Expand Sitemap**
    - Add `/panduan/agent`, `/panduan/store`, `/tanya-ai` to `sitemap.xml` if they are canonical pages.

---

## 10. Test Limitations

- **No Browser Execution:** JavaScript errors, client-side routing behavior, form validation, and AI chat functionality could not be tested.
- **No Visual Testing:** UI layout, responsiveness, color contrast, and mobile rendering were not verified.
- **No Form Submission Testing:** POST forms, login flows, and signup flows could not be exercised.
- **No Session/Auth Testing:** Cookies, JWT handling, and protected routes were not tested.
- **No Load/Stress Testing:** Performance under concurrent users was not measured.

---

## Appendix: Raw Test Data Summary

```
Homepage load time avg:        248 ms
Homepage size:                 35,012 bytes
CSS chunk size:                62,561 bytes
JS chunk size:                 557 bytes
og-image.png size:             1,616 bytes
Unique pages with unique titles: 2 (/panduan, /merchant)
Broken external links:           1 (vixyo.id/bicara)
Staging links exposed:           1 (stg-backoffice.vixyo.id)
Assets returning HTML:           7+ (favicon, manifest, etc.)
API health:                      {"success":true,"data":{"db":"ok"}}
SSL expiry:                      2026-06-29 (55 days)
```
