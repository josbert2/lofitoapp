import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import GlobalStyles from '~/components/GlobalStyles';

import { AppProvider } from './store/session';
import './index.css';
import { AuthProvider } from './store/user';
import { TimerProvider } from './store/timer';
import { getCatalog } from './api/catalog';
import { hydrateSets } from '~/assets/data/sets.data';
import { hydrateTracks } from '~/assets/data/audios.data';

const root = ReactDOM.createRoot(document.getElementById('root'));

const renderApp = () =>
    root.render(
        <GlobalStyles>
            <AuthProvider>
                <AppProvider>
                    <TimerProvider>
                        <App />
                    </TimerProvider>
                </AppProvider>
            </AuthProvider>
        </GlobalStyles>,
    );

const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('catalog-timeout')), ms))]);

// Hidrata escenas y tracks desde el catálogo publicado en la API antes de
// montar el player. Si la API no responde o el catálogo está vacío, el player
// arranca con el catálogo estático (semilla) — nunca queda en blanco.
(async () => {
    try {
        const catalog = await withTimeout(getCatalog(), 3000);
        hydrateSets(catalog?.sets, catalog?.managedSlugs);
        hydrateTracks(catalog?.tracks);
    } catch {
        /* fallback a la data estática */
    } finally {
        renderApp();
    }
})();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
