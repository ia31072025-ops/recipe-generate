import React, { useState, useRef, useEffect, useCallback } from 'react';

import HomePage from './pages/HomePage';
import RecipeGeneratorPage from './pages/RecipeGeneratorPage';
import AboutPage from './pages/AboutPage';

import Header from './components/Header';
import PageIndicator from './components/PageIndicator';
import { PageConfig } from './types';

const pages: PageConfig[] = [
  { name: 'Главная', component: HomePage },
  { name: 'Генератор Рецептов', component: RecipeGeneratorPage },
  { name: 'О нас', component: AboutPage },
];

const App: React.FC = () => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(1); // стартуем с 2-й страницы
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageWidthRef = useRef<number>(0);

  // Используем рефы для хранения позиций для плавного обновления без перерисовок
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Вычисление ширины страницы
  const calculatePageWidth = useCallback(() => {
    if (containerRef.current) {
      pageWidthRef.current = containerRef.current.offsetWidth;
    }
  }, []);

  useEffect(() => {
    calculatePageWidth();
    window.addEventListener('resize', calculatePageWidth);
    return () => window.removeEventListener('resize', calculatePageWidth);
  }, [calculatePageWidth]);

  // Проверка, что событие не на интерактивном элементе
  const isEventOnInteractiveElement = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest('input, button, textarea, a, select');
  };

  // Начало перетаскивания (для touch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEventOnInteractiveElement(e.target)) {
      return; // не мешаем интерактивным элементам
    }

    // Запоминаем стартовую позицию
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;

    setIsDragging(true);

    // Запретить скролл и масштабирование для свайпа
    e.preventDefault();
  }, []);

  // Движение пальца по экрану
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    currentXRef.current = e.touches[0].clientX;
    // Тут не вызываем setState чтобы не перерисовывать лишний раз
    // Для визуального движения используем translateX ниже с currentXRef

    // Предотвращаем скролл во время драга
    e.preventDefault();
  }, [isDragging]);

  // Завершаем свайп (touch)
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const diffX = currentXRef.current - startXRef.current;
    const threshold = pageWidthRef.current * 0.2;

    if (diffX > threshold && currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    } else if (diffX < -threshold && currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }

    // Сбросим позиции
    startXRef.current = 0;
    currentXRef.current = 0;
  }, [isDragging, currentPageIndex]);

  // Аналогичная логика для мыши

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEventOnInteractiveElement(e.target)) {
      return;
    }

    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsDragging(true);

    // Предотвращаем выделение текста при перетаскивании
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    currentXRef.current = e.clientX;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd(); // переиспользуем логику завершения свайпа
  }, [handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleTouchEnd();
    }
  }, [isDragging, handleTouchEnd]);

  // Изменение страницы по индикатору
  const handlePageChange = useCallback((index: number) => {
    setCurrentPageIndex(index);
  }, []);

  // Рассчитываем трансформацию с учётом перемещения при свайпе
  const offsetX = isDragging ? currentXRef.current - startXRef.current : 0;
  const translateXValue = currentPageIndex * -pageWidthRef.current + offsetX;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50"
      // Запрет выделения текста при перетаскивании
      style={{ userSelect: isDragging ? 'none' : 'auto', touchAction: 'pan-y' }} 
    >
      <Header title={pages[currentPageIndex].name} />

      <div
        ref={containerRef}
        className="flex-grow relative w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(${translateXValue}px)` }}
        >
          {pages.map((Page, index) => (
            <div
              key={Page.name}
              className="flex-shrink-0 w-full h-full flex justify-center items-start pt-4 pb-20"
            >
              <Page.component />
            </div>
          ))}
        </div>
      </div>

      <PageIndicator
        total={pages.length}
        currentIndex={currentPageIndex}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default App;

