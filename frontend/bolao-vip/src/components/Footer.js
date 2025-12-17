import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Bolão VIP — Todos os direitos reservados</p>
      <p>Desenvolvido por Icaro Sales</p>
    </footer>
  );
};

export default Footer;

