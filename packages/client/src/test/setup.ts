import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia; ThemeContext lo usa para resolver la preferencia "system".
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom no implementa IntersectionObserver; framer-motion lo usa en las animaciones `whileInView` de la home.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", { writable: true, value: IntersectionObserverStub });
