# Field Notes Frontend

The Angular frontend for the Field Notes journal app. It is intentionally kept in a separate repository so it can be hosted for free with GitHub Pages.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## GitHub Pages

Push this repository to GitHub and enable GitHub Actions as the Pages source. The workflow in `.github/workflows/deploy-pages.yml` builds the app with the repository base path and publishes `dist/journal-frontend/browser`.

The current shell uses local sample data. When the Spring Boot API is ready, configure its URL in an Angular environment file and enable CORS for the Pages origin.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
npm test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
