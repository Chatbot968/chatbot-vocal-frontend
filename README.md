# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Deployment Notes

The production site is hosted on [Render](https://render.com/) as a static site. Render reads `public/static.json` during deployment to apply HTTP headers. The file configures `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` so browsers always fetch the latest files.

## Troubleshooting

If you encounter layout glitches or see an outdated version of the site, clear your browser cache and reload the page. Mobile browsers in particular tend to cache aggressively, so clearing the cache on your phone often resolves layout problems.

## Tailwind CSS Setup

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling. To enable
Tailwind when working locally:

1. Install the required packages:

   ```bash
   npm install -D tailwindcss@3 postcss autoprefixer
   npx tailwindcss init
   ```

2. Ensure `postcss.config.js` includes Tailwind and Autoprefixer:

   ```javascript
   module.exports = {
     plugins: [require('tailwindcss'), require('autoprefixer')],
   };
   ```

3. `src/index.css` should import Tailwind's base, components and utilities:

   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

Create React App processes Tailwind automatically during `npm start` and
`npm run build`.

## Session Storage Limits

`ChatbotWidget.js` stores session history in the browser's local storage. To prevent local storage from growing indefinitely you can provide optional limits via script attributes:

```html
<script
  src="/ChatbotWidget.js"
  data-client-id="my-client"
  data-max-sessions="10"
  data-max-history="50">
</script>
```

* `data-max-sessions` – maximum number of sessions kept. Older sessions are discarded when the limit is exceeded.
* `data-max-history` – maximum number of messages stored per session. Only the most recent messages are retained.

If not specified, all sessions and messages are preserved.

