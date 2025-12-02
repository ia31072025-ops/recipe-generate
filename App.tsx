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
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(1); // Start on RecipeGeneratorPage
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [currentX, setCurrentX] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWidthRef = useRef<number>(0);

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Check if the interaction started on an interactive element
    const isInteractiveElement = target.closest('input, button, textarea, a, select');

    if (isInteractiveElement) {
      // Allow default behavior for interactive elements (e.g., input focus)
      return;
    }

    // Only prevent default if we intend to start a swipe gesture
    e.preventDefault(); // Prevent scrolling/zooming for swipe gesture
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const diffX = currentX - startX;
    const swipeThreshold = pageWidthRef.current * 0.2; // 20% of page width

    if (diffX > swipeThreshold && currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    } else if (diffX < -swipeThreshold && currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }

    // Reset currentX and startX for smooth transition after swipe
    setStartX(0);
    setCurrentX(0);
  }, [isDragging, currentX, startX, currentPageIndex]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Check if the interaction started on an interactive element
    const isInteractiveElement = target.closest('input, button, textarea, a, select');

    if (isInteractiveElement) {
      // Allow default behavior for interactive elements
      return;
    }

    e.preventDefault(); // Prevent default browser drag behavior ONLY if not on an interactive element
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd(); // Re-use touch end logic for mouse up
  }, [handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleTouchEnd(); // End swipe if mouse leaves container while dragging
    }
  }, [isDragging, handleTouchEnd]);

  const handlePageChange = useCallback((index: number) => {
    setCurrentPageIndex(index);
  }, []);

  const translateXValue = currentPageIndex * -pageWidthRef.current + (isDragging ? currentX - startX : 0);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
      <Header title={pages[currentPageIndex].name} />

      <div
        ref={containerRef}
        className="flex-grow relative w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            <div key={Page.name} className="flex-shrink-0 w-full h-full flex justify-center items-start pt-4 pb-20">
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