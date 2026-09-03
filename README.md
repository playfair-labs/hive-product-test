# The Hive Product Test

Private phone-first invitation for product trial sessions at The Pickleball Hive.

## Least work for Louise

Louise’s only job:

> Send Al **Name, Email, Level** (beginner / intermediate / advanced).  
> Optional: a **bench** list for fill-ins.

Al does everything else in the **Operator Console** (not linked from guest invites):

**https://playfair-labs.github.io/hive-product-test/ops**

(` /louise` redirects here.)

### Operator flow

1. Paste Wave 1 list → import (levels map to 9am / 10am / 11am).
2. Optional: paste bench list.
3. **Download mail-merge CSV** and send from `play@thepickleballhive.au` (Gmail / YAMM), **or** tap **Email** per person (mailto opens as whoever is logged into Mail — use the Hive account).
4. Watch RSVPs in `play@` → mark **confirmed** on the status board (or **Sync from RSVP log** if you opened the invite in this same browser).
5. If a session is under 8 → **Pull from bench** / ask Louise for a few more names only.

No public “places left” counter. Guests never see other sessions.

### Guest link shape

```
https://playfair-labs.github.io/hive-product-test/9am?name=Jane%20Smith
```

Without `?name=`, RSVP is disabled. Edit times in `src/data/sessions.ts`.

### Optional live RSVP webhook

In Ops → set a Google Apps Script / Make.com URL. Guest RSVPs still email `play@` and also POST JSON to that webhook.

## Local

```bash
npm install
npm run dev
```

- Ops: `http://127.0.0.1:5174/hive-product-test/ops`
- Guest: `http://127.0.0.1:5174/hive-product-test/9am?name=Jane%20Smith`

## Forms

Submissions email `play@thepickleballhive.au` via FormSubmit. First live submit needs one confirmation click in that inbox.
