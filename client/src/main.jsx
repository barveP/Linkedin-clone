import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { HelmetProvider } from 'react-helmet-async';
import { client } from './apollo/client';
import { AuthProvider } from './auth/AuthContext';
import { initAnalytics } from './analytics/ga';
import App from './App';
import './index.css';

// Load Google Analytics (no-op unless VITE_GA_MEASUREMENT_ID is configured).
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ApolloProvider client={client}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ApolloProvider>
    </HelmetProvider>
  </React.StrictMode>
);
