import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./contexts/I18nContext";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <I18nProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </I18nProvider>,
);
