import React from 'react';
import Navbar from './Navbar';

export const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content animate-fade-in">{children}</main>
    </div>
  );
};
export default Layout;
