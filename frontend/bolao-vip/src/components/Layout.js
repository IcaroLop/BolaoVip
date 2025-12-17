import React from 'react';
import Header from './Header';
import Footer from './Footer';
import './Layout.css'; // caso esteja usando

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <main className="conteudo-principal">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default Layout;

