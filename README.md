# The Hive Product Test

Private phone-first invitation for product trial sessions at The Pickleball Hive.

## Louise — how to invite (waves)

**Do not** put a “places left” counter on the guest invite. Fill quietly in waves.

1. Open the link maker: https://playfair-labs.github.io/hive-product-test/louise  
   (Hive team only — not linked from guest invites.)
2. Pick the session time (guests only see that time).
3. Paste Wave 1 names (~10 hand-picked people), copy personal links, email each person their link.
4. Watch RSVPs in `play@thepickleballhive.au`.
5. If under 8 confirmed, send Wave 2 to the next hand-picked people.

### Guest link shape

```
https://playfair-labs.github.io/hive-product-test/9am?name=Jane%20Smith
https://playfair-labs.github.io/hive-product-test/10am?name=Jane%20Smith
https://playfair-labs.github.io/hive-product-test/11am?name=Jane%20Smith
```

Without `?name=`, RSVP is disabled. Edit times in `src/data/sessions.ts`.

## Local

```bash
npm install
npm run dev
```

- Guest: `http://127.0.0.1:5174/hive-product-test/9am?name=Jane%20Smith`
- Louise: `http://127.0.0.1:5174/hive-product-test/louise` (copied links still use the live GitHub Pages URLs)

## Forms

Submissions email `play@thepickleballhive.au` via FormSubmit. The first live submit sends a confirmation email to that inbox — click once to activate.
