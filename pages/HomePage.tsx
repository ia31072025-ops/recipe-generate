import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-8 md:p-10 lg:p-12 text-center flex flex-col justify-center items-center h-full my-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6">Добро пожаловать!</h2>
      <p className="text-lg text-gray-600 mb-4">
        Используйте свайпы влево и вправо для навигации между страницами.
      </p>
      <p className="text-md text-gray-500 max-w-prose mx-auto">
        Перейдите на страницу "Генератор Рецептов", чтобы начать создание контента.
      </p>
      <div className="mt-8">
        <span className="text-5xl" role="img" aria-label="Swipe gesture">👈👉</span>
      </div>
    </div>
  );
};

export default HomePage;