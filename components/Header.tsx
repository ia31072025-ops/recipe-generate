import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md p-4 z-20">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-center">{title}</h1>
    </header>
  );
};

export default Header;