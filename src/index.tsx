import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./contexts/I18nContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <I18nProvider>
    <AuthProvider>
      <AuthModalProvider>
        <App />
      </AuthModalProvider>
    </AuthProvider>
  </I18nProvider>,
);
