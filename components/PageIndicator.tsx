import React from 'react';

interface PageIndicatorProps {
  total: number;
  currentIndex: number;
  onPageChange: (index: number) => void;
}

const PageIndicator: React.FC<PageIndicatorProps> = ({ total, currentIndex, onPageChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg flex justify-center items-center z-20">
      <div className="flex space-x-2">
        {Array.from({ length: total }).map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              index === currentIndex ? 'bg-purple-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => onPageChange(index)}
            aria-label={`Перейти на страницу ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PageIndicator;