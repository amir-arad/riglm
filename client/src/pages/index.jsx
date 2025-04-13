import Layout from './Layout.jsx';

import Dashboard from './Dashboard';

import Servers from './Servers';

import Contexts from './Contexts';

import Endpoints from './Endpoints';

import Monitoring from './Monitoring';

import Settings from './Settings';

import {
    Route,
    BrowserRouter as Router,
    Routes,
    useLocation,
} from 'react-router-dom';

const PAGES = {
    Dashboard: Dashboard,

    Servers: Servers,

    Contexts: Contexts,

    Endpoints: Endpoints,

    Monitoring: Monitoring,

    Settings: Settings,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(
        (page) => page.toLowerCase() === urlLastPart.toLowerCase()
    );
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/" element={<Dashboard />} />

                <Route path="/Dashboard" element={<Dashboard />} />

                <Route path="/Servers" element={<Servers />} />

                <Route path="/Contexts" element={<Contexts />} />

                <Route path="/Endpoints" element={<Endpoints />} />

                <Route path="/Monitoring" element={<Monitoring />} />

                <Route path="/Settings" element={<Settings />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
