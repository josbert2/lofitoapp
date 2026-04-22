import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import GlobalStyles from '~/components/GlobalStyles';

import { AppProvider } from './store/session';
import './index.css';
import { AuthProvider } from './store/user';
import { TimerProvider } from './store/timer';

const root = ReactDOM.createRoot(document.getElementById('root'));
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
