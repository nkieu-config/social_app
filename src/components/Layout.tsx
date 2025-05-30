import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 lg:w-72">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-10">
        <MobileNavigation />
      </div>
    </div>
  );
};

export default Layout;