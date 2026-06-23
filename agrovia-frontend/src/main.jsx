import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import ThemeProvider, { getInitialTheme } from './components/ThemeProvider';
import './styles/globals.css';

// Apply the persisted theme before first paint to avoid a flash of the wrong theme.
if (getInitialTheme() === 'dark') {
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
