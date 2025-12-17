import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Run domain demo in development only
if (import.meta.env.DEV) {
  import("./domain/dev/demo").then(({ runDemo }) => {
    runDemo();
  });

  // Run golden test cases for template selection verification
  import("./features/compare/__dev__/runCompareGoldenCases").then(({ runCompareGoldenCases }) => {
    runCompareGoldenCases();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
  