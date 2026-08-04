# Freedom Countdown

A personal finance dashboard for tracking:

- consumer debt
- car finance separately
- Freedom Fund savings
- payment updates and statement reconciliation
- family income and expenses

## GitHub Pages

1. Upload all three files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save.

The app stores data in the browser using `localStorage`.


## Releases

### v2.0.1
- Fixed bottom navigation so only the active tab is highlighted.
- Home remains elevated but no longer appears selected while Family or another tab is open.
- Standardized the app version in `index.html` and `app.js`.
