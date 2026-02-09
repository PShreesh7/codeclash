import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const AppLayout = () => (
  <div className="min-h-screen bg-background">
    <AppSidebar />
    <main className="ml-64 p-8 min-h-screen">
      <Outlet />
    </main>
  </div>
);

export default AppLayout;
