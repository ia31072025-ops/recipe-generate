import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-8 md:p-10 lg:p-12 text-center flex flex-col justify-center items-center h-full my-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6">О приложении</h2>
      <p className="text-lg text-gray-600 mb-4 max-w-prose mx-auto">
        Это приложение разработано для автоматической генерации полного комплекта материалов для публикации видеорецептов на YouTube и в социальных сетях.
      </p>
      <p className="text-md text-gray-500 mb-4 max-w-prose mx-auto">
        Мы используем передовые технологии искусственного интеллекта (Gemini API) для создания SEO-оптимизированных заголовков, описаний, тегов, текстов для постов, а также для генерации привлекательных обложек видео.
      </p>
      <p className="text-md text-gray-500 max-w-prose mx-auto">
        Наша цель — помочь кулинарным блогерам и энтузиастам максимально эффективно продвигать свой контент, экономя время и усилия.
      </p>
    </div>
  );
};

export default AboutPage;