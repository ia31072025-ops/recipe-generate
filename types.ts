import React from 'react'; // Import React for React.ComponentType

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface SocialMediaPost {
  platform: 'VK' | 'Telegram' | 'Instagram' | 'TikTok'; // Добавлены Instagram и TikTok
  type: 'Full Publication' | 'Post' | 'Reels Caption' | 'Shorts Caption' | 'TikTok Caption'; // Добавлены типы для коротких видео
  text: string; // Текст поста
}

export interface GeneratedContent {
  youtubeTitle: string[]; // Изменено на массив строк для нескольких названий
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

export type ThemeColor = 'blue' | 'purple' | 'green' | 'red';

// New interface for page configuration
export interface PageConfig {
  name: string;
  component: React.ComponentType;
}