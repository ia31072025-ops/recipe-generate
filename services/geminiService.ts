import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { GeneratedContent, Ingredient, SocialMediaPost } from '../types';

const TEXT_MODEL_NAME = 'gemini-3-pro-preview'; // For complex text tasks
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview'; // For high-quality image generation, especially with text rendering

// Функция для генерации обложки с помощью Gemini API
export const generateGeminiThumbnail = async (
  description: string,
  recipeName: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  // Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Создай яркое и аппетитное изображение для обложки YouTube-видео в формате ${aspectRatio} для рецепта "${recipeName}". Изображение должно соответствовать следующему описанию: "${description}". Название рецепта "${recipeName}" ДОЛЖНО быть четко, крупным шрифтом, БЕЗ ОШИБОК и ТОЛЬКО НА РУССКОМ ЯЗЫКЕ, русскими буквами написано на обложке. Включи привлекательный визуал блюда.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K" // Defaulting to 1K as 2K/4K was not explicitly requested
        },
      },
    });

    let base64ImageBytes: string | undefined;
    let mimeType: string = 'image/png'; // Default mimeType for generated image

    // Iterate through parts to find the image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64ImageBytes = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType; // Use actual mimeType if provided
        break; // Found the image, no need to check further
      }
    }

    if (!base64ImageBytes) {
      throw new Error("No image data received from API.");
    }
    return `data:${mimeType};base64,${base64ImageBytes}`;
  } catch (error) {
    console.error('Error generating thumbnail image:', error);
    throw new Error(`Failed to generate thumbnail image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Функция для генерации обложки на холсте (без API)
export const generateCanvasThumbnail = async (
  recipeName: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    let width, height;

    // Определяем размеры холста в зависимости от соотношения сторон
    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else { // 1:1
      width = 1000;
      height = 1000;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Could not get canvas context.");
    }

    // Заливка фона (простой градиент или цвет)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fbcfe8'); // light pink
    gradient.addColorStop(1, '#a78bfa'); // light purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Добавляем текст
    ctx.font = `${Math.min(width, height) / 10}px 'Arial Black', sans-serif`; // Динамический размер шрифта
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;

    // Отрисовка текста, возможно, с переносом
    const words = recipeName.split(' ');
    let line = '';
    const lines = [];
    const maxWidth = width * 0.8; // 80% ширины для текста

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const lineHeight = Math.min(width, height) / 10 * 1.2; // 1.2x font size
    const startY = height / 2 - (lines.length - 1) * lineHeight / 2;

    lines.forEach((l, i) => {
      const y = startY + i * lineHeight;
      ctx.strokeText(l.trim(), width / 2, y); // Контур
      ctx.fillText(l.trim(), width / 2, y); // Заливка
    });

    resolve(canvas.toDataURL('image/png'));
  });
};


export const generateRecipeContent = async (
  recipeName: string,
  contentType: 'standard' | 'short' = 'standard', // Новый параметр
  fieldsToGenerate?: (keyof GeneratedContent)[], // Опциональный параметр для частичной генерации
): Promise<GeneratedContent> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  // Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Базовый промпт, который будет адаптироваться
  let promptParts: string[] = [];
  let responseSchemaProperties: { [key: string]: any } = {};
  let responseSchemaRequired: string[] = [];

  const addField = (fieldName: keyof GeneratedContent, promptText: string, schema: any) => {
    if (!fieldsToGenerate || fieldsToGenerate.includes(fieldName)) {
      promptParts.push(promptText);
      responseSchemaProperties[fieldName] = schema;
      responseSchemaRequired.push(fieldName);
    }
  };

  if (contentType === 'standard') {
    addField('youtubeTitle', `1.  **Названия для YouTube-видео:** Создай 3-5 привлекательных, кликабельных и максимально SEO-оптимизированных названий, включающих ключевые слова, популярные в поиске YouTube и Google. Они ДОЛЖНЫ содержать вопросительные слова (например, 'Как...', 'Почему...') или быть в формате списков ('Топ-5...', '7 лучших...'), чтобы повысить кликабельность.`, { type: Type.ARRAY, items: { type: Type.STRING } }); // Изменено на массив
    addField('youtubeDescription', `2.  **Описание для YouTube-видео:** Напиши подробное, максимально релевантное и привлекательное описание с использованием популярных ключевых слов, релевантных хештегов (до 5-7 штук), и ЧЕТКИХ призывов к действию (подписка на канал, лайк видео, комментарий). Обязательно используй **Markdown для форматирования**, включая **заголовки (## или ###), списки (- или *), и выделение текста (жирный шрифт с **)**. Включи примеры тайм-кодов (например, 0:00 Вступление, 0:30 Ингредиенты, 1:00 Приготовление), а также используй структурированные блоки (например, списки или абзацы) для улучшения восприятия и читаемости. Начни описание со вступительного предложения, что содержится в видео, например, "В этом видео вы узнаете, как приготовить...".`, { type: Type.STRING });
    addField('youtubeTags', `3.  **Теги для YouTube-видео:** Список из 10-15 релевантных хештегов для YouTube. Подбирай популярные тематические ключевики и хештеги, учитывая сезонность и текущие тренды, применимые к этому рецепту.`, { type: Type.ARRAY, items: { type: Type.STRING } });
    addField('socialMediaPosts', `4.  **Сопроводительные посты для соцсетей:** Сгенерируй следующие посты:
        -   **Для ВКонтакте (Полная публикация):** Развернутый пост с подробным описанием рецепта, возможностью задать вопросы, эмодзи, призывами к действию и хештегами.
        -   **Для Телеграм-канала (Пост):** Создай подробный и интересный пост для Телеграм-канала с акцентом на рецепт, его уникальность, возможностью задать вопросы и призывом к действию (например, перейти по ссылке на видео или сохранить рецепт). Используй эмодзи и хештеги.`, {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, description: "Platform (e.g., VK, Telegram)" },
          type: { type: Type.STRING, description: "Type of post (e.g., Full Publication, Post)" },
          text: { type: Type.STRING, description: "The post content" },
        },
        required: ['platform', 'type', 'text'],
      },
    });
    addField('ingredients', `5.  **Список ингредиентов:** Подробный список с указанием количества и единиц измерения.`, {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING },
          unit: { type: Type.STRING },
        },
        required: ['name', 'quantity', 'unit'],
      },
    });
    addField('instructions', `6.  **Пошаговая инструкция:** Четкие и понятные шаги приготовления.`, { type: Type.ARRAY, items: { type: Type.STRING } });
    addField('thumbnailDescription', `7.  **Описание для миниатюры YouTube:** Короткое описание идеи для привлекательной миниатюры.`, { type: Type.STRING });
    addField('optimalPublishingSchedule', `8.  **Оптимальное время и дата публикации видео:** Предоставь общие рекомендации по оптимальному времени и дню недели для публикации кулинарного видео на YouTube/в соцсетях, чтобы максимизировать охват и вовлеченность. Учти, что это общие рекомендации, а не анализ конкретной статистики аудитории. Например, "Лучшее время для публикации кулинарных видео обычно приходится на...", "Рассмотрите дни недели, такие как...".`, { type: Type.STRING });
    addField('promotionTips', `9.  **Советы по продвижению и рекламе видео:** Предоставь рекомендации по улучшению продвижения и рекламы видео. Включи советы по улучшению CTR (кликабельности) и удержанию аудитории, а также упомяни, как могут быть полезны инструменты аналитики YouTube (например, TubeBuddy, VidIQ - доступны бесплатные версии). Сфокусируйся на общих лучших практиках для кулинарного канала.`, { type: Type.STRING });

  } else { // contentType === 'short'
    addField('youtubeTitle', `1.  **Названия для YouTube Shorts/Reels/TikTok:** Создай 2-3 очень коротких, цепляющих и вирусных названия для короткого видео по рецепту "${recipeName}". Используй трендовые фразы, эмодзи и вопросительные слова.`, { type: Type.ARRAY, items: { type: Type.STRING } });
    addField('youtubeDescription', `2.  **Описание для YouTube Shorts/Reels/TikTok:** Напиши очень краткое, но информативное описание (2-3 предложения) с призывом к действию (например, 'Подпишись!', 'Попробуй приготовить!') и 3-5 трендовыми хештегами. Используй эмодзи и **жирный шрифт для ключевых фраз**.`, { type: Type.STRING });
    addField('youtubeTags', `3.  **Теги для YouTube Shorts/Reels/TikTok:** Список из 5-8 максимально релевантных и трендовых хештегов для алгоритмов коротких видео.`, { type: Type.ARRAY, items: { type: Type.STRING } });
    addField('socialMediaPosts', `4.  **Сопроводительные посты для соцсетей (короткие форматы):** Сгенерируй следующие посты:
        -   **Для Instagram Reels (Caption):** Короткое и привлекательное описание для Reels с призывом к действию, эмодзи и 3-5 трендовыми хештегами.
        -   **Для TikTok (Caption):** Вирусный, краткий текст для TikTok с вопросом или призывом к действию, популярными хештегами и эмодзи.
        -   **Для ВКонтакте (Пост):** Краткий, но информативный пост для ВКонтакте с акцентом на быстрое приготовление рецепта, с эмодзи и хештегами.
        -   **Для Телеграм-канала (Пост):** Краткий пост для Телеграм с акцентом на уникальность рецепта или лайфхак, эмодзи и призывом посмотреть короткое видео.`, {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, description: "Platform (e.g., Instagram, TikTok, VK, Telegram)" },
          type: { type: Type.STRING, description: "Type of post (e.g., Reels Caption, TikTok Caption, Post)" },
          text: { type: Type.STRING, description: "The post content" },
        },
        required: ['platform', 'type', 'text'],
      },
    });
    addField('ingredients', `5.  **Список ингредиентов (кратко):** Краткий список основных ингредиентов (5-7 позиций) с количеством, подходящий для быстрого отображения в коротком видео.`, {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING },
          unit: { type: Type.STRING },
        },
        required: ['name', 'quantity', 'unit'],
      },
    });
    addField('instructions', `6.  **Пошаговая инструкция (очень кратко):** 3-5 очень коротких и четких шагов приготовления, подходящих для быстрого темпа короткого видео.`, { type: Type.ARRAY, items: { type: Type.STRING } });
    addField('thumbnailDescription', `7.  **Описание для вертикальной миниатюры (9:16) YouTube Shorts/Reels/TikTok:** Короткое описание идеи для привлекательной вертикальной миниатюры.`, { type: Type.STRING });
    addField('optimalPublishingSchedule', `8.  **Оптимальное время и дата публикации короткого видео:** Предоставь рекомендации по лучшему времени для публикации коротких видео (Shorts, Reels, TikTok), учитывая максимальную активность аудитории.`, { type: Type.STRING });
    addField('promotionTips', `9.  **Советы по продвижению короткого видео:** Предоставь конкретные советы по продвижению Shorts/Reels/TikTok, включая использование трендовой музыки, призывы к взаимодействию и дуэты/коллаборации.`, { type: Type.STRING });
  }

  const fullPrompt = `Сгенерируй следующий контент для рецепта "${recipeName}":\n\n` + promptParts.join('\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: responseSchemaProperties,
    required: responseSchemaRequired,
  };

  try {
    const textResponse: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonStr = textResponse.text?.trim();
    if (!jsonStr) {
      throw new Error("No content generated or empty response from API.");
    }
    
    // Add logging to inspect the raw JSON string
    console.log("Raw JSON response from Gemini (text):", jsonStr);

    const parsedContent: GeneratedContent = JSON.parse(jsonStr);

    // Basic validation to ensure all expected fields are present
    // Only validate fields that were actually requested for generation
    responseSchemaRequired.forEach(field => {
        if (!parsedContent.hasOwnProperty(field) || parsedContent[field as keyof GeneratedContent] === undefined || parsedContent[field as keyof GeneratedContent] === null) {
            throw new Error(`Incomplete data received from API. Missing required field: ${field}.`);
        }
    });

    return parsedContent;
  } catch (error) {
    console.error('Error generating recipe content:', error);
    // Attempt to parse if it's a JSON error message from the API
    if (error instanceof Error && error.message.includes("Unexpected token")) {
      console.error("The API returned malformed JSON. Check the prompt and schema.");
    }
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`);
  }
};