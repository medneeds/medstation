import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" storageKey="medstation-theme-v2" defaultTheme="system" enableSystem enableColorScheme>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </ErrorBoundary>
);
