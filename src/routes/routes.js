import Main from '~/pages/Main/Main';
import NotFound from '~/pages/NotFound';
import Admin from '~/pages/Admin';
import { PlayerLayout } from '~/layouts/';

export const publicRoutes = [
    {
        path: '/',
        component: Main,
        layout: PlayerLayout,
    },

    {
        path: '/admin',
        component: Admin,
        layout: null,
    },

    {
        path: '*',
        component: NotFound,
        layout: null,
    },
];
