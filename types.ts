import React from 'react'; // Для React.ComponentType

// ======================
// Типы для ингредиентов и постов в соцсетях
// ======================
export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface SocialMediaPost {
  platform: 'VK' | 'Telegram' | 'Instagram' | 'TikTok';
  type: 'Full Publication' | 'Post' | 'Reels Caption' | 'Shorts Caption' | 'TikTok Caption';
  text: string;
}

// ======================
// Основной интерфейс сгенерированного контента
// ======================
export interface GeneratedContent {
  youtubeTitle: string[];              // Массив для нескольких вариантов названия
  youtubeDescription: string;
  youtubeTags: string[];
  socialMediaPosts: SocialMediaPost[];
  ingredients: Ingredient[];
  instructions: string[];
  thumbnailDescription: string;
  thumbnailImageUrl?: string;
  optimalPublishingSchedule?: string;
  promotionTips?: string;
}

// ======================
// Цветовые темы
// ======================
export type ThemeColor = 'blue' | 'purple' | 'green' | 'red';

// ======================
// Конфигурация страницы
// ======================
export interface PageConfig {
  name: string;
  component: React.ComponentType;
}
