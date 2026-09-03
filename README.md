# The Hive Product Test

Private phone-first invitation for product trial sessions at The Pickleball Hive.

## Guest links (personalised)

Louise sends **one session + name** per person. Guests only see their time.

```
https://playfair-labs.github.io/hive-product-test/9am?name=Jane%20Smith
https://playfair-labs.github.io/hive-product-test/10am?name=Jane%20Smith
https://playfair-labs.github.io/hive-product-test/11am?name=Jane%20Smith
```

Spaces in names → `%20`. Edit times in `src/data/sessions.ts`.

Without `?name=`, RSVP is disabled (limited spots).

## Local

```bash
npm install
npm run dev
```

Open e.g. `http://127.0.0.1:5174/hive-product-test/9am?name=Jane%20Smith`

## Forms

Submissions email `play@thepickleballhive.au` via FormSubmit. The first live submit sends a confirmation email to that inbox — click once to activate.
