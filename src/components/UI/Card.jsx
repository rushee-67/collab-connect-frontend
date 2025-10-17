import React from 'react';

const Card = ({ children, className = '', hover = false, onClick }) => {
  const baseClasses = 'bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-gray-800 rounded-xl shadow-lg';
  const hoverClasses = hover ? 'hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 cursor-pointer transform hover:scale-105' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
