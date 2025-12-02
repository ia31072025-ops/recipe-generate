import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GeneratedContent, Ingredient, SocialMediaPost } from '../types';
import { generateRecipeContent, generateGeminiThumbnail, generateCanvasThumbnail } from '../services/geminiService';
import Spinner from '../components/Spinner';
import CopyToClipboardButton from '../components/CopyToClipboardButton';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown

const RecipeGeneratorPage: React.FC = () => {
  const [recipeName, setRecipeName] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState<boolean>(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [customThumbnailPrompt, setCustomThumbnailPrompt] = useState<string>('');
  const [useApiImageGenerator, setUseApiImageGenerator] = useState<boolean>(true); // New state for generator choice
  const [showApiKeySelectionPrompt, setShowApiKeySelectionPrompt] = useState<boolean>(false); // State for API key prompt
  const [contentType, setContentType] = useState<'standard' | 'short'>('standard'); // New state for content type

  // State for editable YouTube description
  const [editableYoutubeDescription, setEditableYoutubeDescription] = useState<string>('');
  const [regeneratingDescription, setRegeneratingDescription] = useState<boolean>(false);


  useEffect(() => {
    if (generatedContent?.thumbnailDescription) {
      setCustomThumbnailPrompt(generatedContent.thumbnailDescription);
    }
    if (generatedContent?.youtubeDescription) {
      setEditableYoutubeDescription(generatedContent.youtubeDescription);
    }
  }, [generatedContent]);

  const checkAndPromptApiKey = useCallback(async () => {
    if (!useApiImageGenerator) {
      setShowApiKeySelectionPrompt(false); // No API key needed for canvas generator
      return true;
    }

    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowApiKeySelectionPrompt(true);
        return false;
      }
    }
    setShowApiKeySelectionPrompt(false);
    return true;
  }, [useApiImageGenerator]);

  const openApiKeySelectionDialog = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setShowApiKeySelectionPrompt(false); // Assume successful selection and hide prompt
        // User will need to re-click generate after selecting key
      } catch (err) {
        console.error('Failed to open API key selection dialog:', err);
        setError('Не удалось открыть диалог выбора API ключа. Попробуйте еще раз.');
      }
    } else {
      setError('Функция выбора API ключа недоступна. Убедитесь, что приложение запущено в среде AI Studio.');
    }
  }, []);


  const handleGenerate = useCallback(async () => {
    setError(null);
    setGeneratedContent(null);
    setThumbnailError(null);
    setShowApiKeySelectionPrompt(false); // Reset prompt visibility
    setEditableYoutubeDescription(''); // Clear editable description

    if (!recipeName.trim()) {
      setError('Пожалуйста, введите название рецепта.');
      return;
    }

    if (useApiImageGenerator && !(await checkAndPromptApiKey())) {
      return;
    }

    setLoading(true);
    try {
      const content = await generateRecipeContent(recipeName, contentType); // Pass contentType
      setGeneratedContent(content);
      setEditableYoutubeDescription(content.youtubeDescription); // Initialize editable description

      if (content.thumbnailDescription) {
        setCustomThumbnailPrompt(content.thumbnailDescription); // Pre-fill custom prompt
      }

      // Determine aspect ratio for thumbnail based on content type
      const thumbnailAspectRatio: '16:9' | '9:16' = contentType === 'short' ? '9:16' : '16:9';
      let imageUrl: string;

      if (useApiImageGenerator) {
        try {
          setThumbnailLoading(true);
          imageUrl = await generateGeminiThumbnail(
            customThumbnailPrompt.trim() || content.thumbnailDescription,
            recipeName,
            thumbnailAspectRatio
          );
          setThumbnailLoading(false);
        } catch (thumbError) {
          const errorMessage = thumbError instanceof Error ? thumbError.message : String(thumbError);
          if (
            errorMessage.includes("Requested entity was not found.") ||
            errorMessage.includes("The caller does not have permission") ||
            (typeof thumbError === 'object' && thumbError !== null && 'error' in thumbError && typeof (thumbError as any).error === 'object' && (thumbError as any).error !== null && 'message' in (thumbError as any).error && ((thumbError as any).error.message as string).includes("The caller does not have permission"))
          ) {
            setError('Для генерации изображений AI требуется API ключ с соответствующими разрешениями. Пожалуйста, выберите API ключ.');
            setShowApiKeySelectionPrompt(true);
          } else {
            setError(`Не удалось сгенерировать обложку AI: ${errorMessage}`);
          }
          setThumbnailLoading(false);
          // Proceed with other content even if thumbnail generation fails for AI
          imageUrl = ''; // Clear image URL if AI generation fails
        }
      } else {
        setThumbnailLoading(true);
        imageUrl = await generateCanvasThumbnail(recipeName, thumbnailAspectRatio);
        setThumbnailLoading(false);
      }
      setGeneratedContent((prevContent) => ({
        ...(prevContent as GeneratedContent),
        thumbnailImageUrl: imageUrl,
      }));

    } catch (err) {
      console.error('Failed to generate content:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Не удалось сгенерировать контент: ${errorMessage}`);
    } finally {
      setLoading(false);
      setThumbnailLoading(false); // Ensure thumbnail loading is reset
    }
  }, [recipeName, contentType, useApiImageGenerator, customThumbnailPrompt, checkAndPromptApiKey]);


  const handleRegenerateThumbnail = useCallback(async (useCustomPrompt: boolean = false) => {
    if (!generatedContent || !recipeName.trim()) {
      setThumbnailError('Невозможно сгенерировать обложку заново без названия рецепта.');
      return;
    }
    setShowApiKeySelectionPrompt(false); // Reset prompt visibility

    if (useApiImageGenerator && !(await checkAndPromptApiKey())) {
      return;
    }

    const promptToUse = useCustomPrompt && customThumbnailPrompt.trim()
      ? customThumbnailPrompt.trim()
      : generatedContent.thumbnailDescription;

    if (useApiImageGenerator && !promptToUse) {
      setThumbnailError('Промпт для обложки отсутствует. Сначала сгенерируйте основной контент или введите свой промпт.');
      return;
    }

    setThumbnailLoading(true);
    setThumbnailError(null);

    const thumbnailAspectRatio: '16:9' | '9:16' = contentType === 'short' ? '9:16' : '16:9'; // Dynamic aspect ratio

    try {
      let newImageUrl: string;
      if (useApiImageGenerator) {
        newImageUrl = await generateGeminiThumbnail(promptToUse, recipeName, thumbnailAspectRatio);
      } else {
        newImageUrl = await generateCanvasThumbnail(recipeName, thumbnailAspectRatio);
      }

      setGeneratedContent((prevContent) => ({
        ...(prevContent as GeneratedContent),
        thumbnailImageUrl: newImageUrl,
      }));
    } catch (err) {
      console.error('Failed to regenerate thumbnail:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        useApiImageGenerator && (
        errorMessage.includes("Requested entity was not found.") ||
        errorMessage.includes("The caller does not have permission") ||
        (typeof err === 'object' && err !== null && 'error' in err && typeof (err as any).error === 'object' && (err as any).error !== null && 'message' in (err as any).error && ((err as any).error.message as string).includes("The caller does not have permission")))
      ) {
        setThumbnailError('Для генерации изображений AI требуется API ключ с соответствующими разрешениями. Пожалуйста, выберите API ключ.');
        setShowApiKeySelectionPrompt(true);
      } else {
        setThumbnailError(`Не удалось сгенерировать обложку заново: ${errorMessage}`);
      }
    } finally {
      setThumbnailLoading(false);
    }
  }, [generatedContent, recipeName, customThumbnailPrompt, useApiImageGenerator, contentType, checkAndPromptApiKey]);

  // Handle regenerating only the YouTube description
  const handleRegenerateYoutubeDescription = useCallback(async () => {
    if (!recipeName.trim()) {
      setError('Невозможно сгенерировать описание заново без названия рецепта.');
      return;
    }
    setRegeneratingDescription(true);
    setError(null); // Clear main error
    try {
      // Generate only the youtubeDescription field
      const tempContent = await generateRecipeContent(recipeName, contentType, ['youtubeDescription']);
      if (tempContent.youtubeDescription) {
        setGeneratedContent((prev) => ({ ...prev!, youtubeDescription: tempContent.youtubeDescription }));
        setEditableYoutubeDescription(tempContent.youtubeDescription);
      } else {
        setError('Не удалось сгенерировать новое описание.');
      }
    } catch (err) {
      console.error('Failed to regenerate YouTube description:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Не удалось сгенерировать новое описание: ${errorMessage}`);
    } finally {
      setRegeneratingDescription(false);
    }
  }, [recipeName, contentType]);


  const handleDownloadThumbnail = useCallback(() => {
    if (generatedContent?.thumbnailImageUrl) {
      const link = document.createElement('a');
      link.href = generatedContent.thumbnailImageUrl;
      link.download = `${recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_thumbnail.png`; // Use PNG for canvas images
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [generatedContent, recipeName]);


  return (
    <div className="flex flex-col flex-grow items-center w-full max-w-4xl px-4">
      <div className="w-full bg-white shadow-2xl rounded-xl p-8 md:p-10 lg:p-12 mb-8 mt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 mb-6">
          Генератор Контента для Рецептов
        </h1>
        <p className="text-center text-gray-600 mb-8 max-w-prose mx-auto">
          Введите название рецепта, чтобы сгенерировать полный набор материалов для YouTube-видео и постов в соцсетях,
          оптимизированных для максимального охвата и SEO, включая обложку видео.
        </p>

        {/* Content Type Selector */}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-medium mb-2">Тип видео:</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-purple-600"
                name="contentType"
                value="standard"
                checked={contentType === 'standard'}
                onChange={() => setContentType('standard')}
              />
              <span className="ml-2 text-gray-700 text-base">Стандартное видео</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-5 w-5 text-purple-600"
                name="contentType"
                value="short"
                checked={contentType === 'short'}
                onChange={() => setContentType('short')}
              />
              <span className="ml-2 text-gray-700 text-base">Короткое видео (Shorts/Reels/TikTok)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full">
          <input
            type="text"
            className="flex-grow w-full md:w-auto p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-lg"
            placeholder="Например, 'Луковые оладьи'"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleGenerate();
              }
            }}
            aria-label="Название рецепта"
          />
          <button
            onClick={handleGenerate}
            className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-lg"
            disabled={loading}
          >
            {loading ? 'Генерация...' : 'Сгенерировать контент'}
          </button>
        </div>
        {error && <p className="text-red-600 text-center mt-4 text-sm md:text-base">{error}</p>}
        {showApiKeySelectionPrompt && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-4" role="alert">
            <p className="font-bold">Требуется API ключ!</p>
            <p>Для генерации изображений AI используется модель, требующая платный API ключ. Пожалуйста, выберите свой API ключ:</p>
            <button
              onClick={openApiKeySelectionDialog}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 text-base"
            >
              Выбрать API ключ
            </button>
            <p className="mt-2 text-sm">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-800">
                Подробнее о тарифах Gemini API.
              </a>
            </p>
          </div>
        )}
      </div>

      {loading && <Spinner />}

      {generatedContent && (
        <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-4 md:p-6 lg:p-8 mt-8 mb-8 animate-fade-in flex flex-col space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 text-center">
            Сгенерированный контент для "{recipeName}"
          </h2>

          {/* 1. YouTube Titles and Tags */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">🎬</span> YouTube Названия
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">Названия видео:</label>
                {(generatedContent.youtubeTitle as string[]).map((title, index) => ( // Cast to string[]
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2 last:mb-0">
                    <p className="flex-grow p-3 bg-white border border-gray-200 rounded-md text-gray-800 text-base break-words">
                      {title}
                    </p>
                    <CopyToClipboardButton textToCopy={title} label="Копировать" theme="blue" className="w-full sm:w-auto"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">Теги видео:</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <p className="flex-grow p-3 bg-white border border-gray-200 rounded-md text-gray-800 text-base break-words">
                    {generatedContent.youtubeTags.join(', ')}
                  </p>
                  <CopyToClipboardButton
                    textToCopy={generatedContent.youtubeTags.join(', ')}
                    label="Копировать"
                    theme="blue"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. YouTube Description (с редактированием и Markdown) */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">📝</span> Описание видео
            </h3>
            <label htmlFor="editableYoutubeDescription" className="block text-gray-700 text-lg font-medium mb-2">
              Редактируемое описание:
            </label>
            <textarea
              id="editableYoutubeDescription"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base resize-y min-h-[150px]"
              placeholder="Отредактируйте описание видео..."
              value={editableYoutubeDescription}
              onChange={(e) => setEditableYoutubeDescription(e.target.value)}
              aria-label="Редактируемое описание YouTube-видео"
            ></textarea>
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={handleRegenerateYoutubeDescription}
                className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={regeneratingDescription || loading}
              >
                {regeneratingDescription ? 'Генерация...' : 'Генерировать новое описание'}
              </button>
              <CopyToClipboardButton
                textToCopy={editableYoutubeDescription}
                label="Копировать"
                theme="blue"
                className="w-full sm:w-auto"
              />
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-700 mb-2">Предварительный просмотр (Markdown):</h4>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md prose prose-blue max-w-none">
                <ReactMarkdown>{editableYoutubeDescription}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* 3. YouTube Thumbnail */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">🖼️</span> Обложка видео ({contentType === 'short' ? '9:16' : '16:9'})
            </h3>

            {/* Thumbnail Generator Choice */}
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="useApiGenerator"
                className="form-checkbox h-5 w-5 text-purple-600 transition duration-150 ease-in-out"
                checked={useApiImageGenerator}
                onChange={(e) => setUseApiImageGenerator(e.target.checked)}
              />
              <label htmlFor="useApiGenerator" className="ml-2 text-gray-700 text-base md:text-lg font-medium">
                Использовать AI-генератор обложек
              </label>
            </div>

            {useApiImageGenerator && (
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">Идея для миниатюры (от ИИ):</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <p className="flex-grow p-3 bg-white border border-gray-200 rounded-md text-gray-800 text-base break-words">
                    {generatedContent.thumbnailDescription}
                  </p>
                  <CopyToClipboardButton
                    textToCopy={generatedContent.thumbnailDescription}
                    label="Копировать"
                    theme="blue"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            )}

            {generatedContent.thumbnailImageUrl && (
              <div className="mt-4">
                <img
                  src={generatedContent.thumbnailImageUrl}
                  alt={useApiImageGenerator ? generatedContent.thumbnailDescription : `Обложка для ${recipeName}`}
                  className="max-w-full h-auto rounded-md shadow-md mb-4 mx-auto"
                />
                <div className="w-full mt-4">
                  {useApiImageGenerator && (
                    <>
                      <label htmlFor="customThumbnailPrompt" className="block text-gray-700 text-lg font-medium mb-2">
                        Ваш промпт для обложки (по желанию):
                      </label>
                      <textarea
                        id="customThumbnailPrompt"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base resize-y min-h-[80px]"
                        placeholder="Опишите, каким должно быть изображение для обложки..."
                        value={customThumbnailPrompt}
                        onChange={(e) => setCustomThumbnailPrompt(e.target.value)}
                        aria-label="Ваш промпт для обложки"
                      ></textarea>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  <button
                    onClick={() => handleRegenerateThumbnail(false)}
                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || thumbnailLoading || (useApiImageGenerator && !generatedContent.thumbnailDescription)}
                  >
                    {thumbnailLoading && !customThumbnailPrompt.trim() && useApiImageGenerator
                      ? 'Генерация...'
                      : thumbnailLoading && !useApiImageGenerator
                        ? 'Генерация...'
                        : useApiImageGenerator ? 'Сгенерировать (от ИИ)' : 'Сгенерировать простую обложку'}
                  </button>
                  {useApiImageGenerator && (
                    <button
                      onClick={() => handleRegenerateThumbnail(true)}
                      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading || thumbnailLoading || !customThumbnailPrompt.trim()}
                    >
                      {thumbnailLoading && customThumbnailPrompt.trim() ? 'Генерация...' : 'Использовать свой промпт'}
                    </button>
                  )}
                  <button
                    onClick={handleDownloadThumbnail}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base"
                    disabled={!generatedContent.thumbnailImageUrl}
                  >
                    Скачать обложку
                  </button>
                </div>
                {thumbnailError && <p className="text-red-600 text-center mt-2 text-sm">{thumbnailError}</p>}
              </div>
            )}
          </div>

          {/* 4. YouTube Schedule and Promotion */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">📅</span> Расписание и Продвижение
            </h3>
            {generatedContent.optimalPublishingSchedule && (
              <div className="mb-6">
                <label className="block text-gray-700 text-lg font-medium mb-2">Оптимальное время публикации:</label>
                <div className="flex flex-col space-y-2">
                  <pre className="flex-grow p-3 bg-white border border-gray-200 rounded-md whitespace-pre-wrap text-gray-800 text-base break-words">
                    {generatedContent.optimalPublishingSchedule}
                  </pre>
                  <CopyToClipboardButton
                    textToCopy={generatedContent.optimalPublishingSchedule}
                    label="Копировать"
                    theme="blue"
                    className="self-end w-full sm:w-auto"
                  />
                </div>
              </div>
            )}
            {generatedContent.promotionTips && (
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-2">Советы по продвижению видео:</label>
                <div className="flex flex-col space-y-2">
                  <pre className="flex-grow p-3 bg-white border border-gray-200 rounded-md whitespace-pre-wrap text-gray-800 text-base">
                    {generatedContent.promotionTips}
                  </pre>
                  <CopyToClipboardButton
                    textToCopy={generatedContent.promotionTips}
                    label="Копировать"
                    theme="blue"
                    className="self-end w-full sm:w-auto"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Social Media Posts Section */}
          <div className="bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-purple-800 mb-4 flex items-center">
              <span className="mr-2">📱</span> Посты для соцсетей
            </h3>
            <div className="space-y-6">
              {generatedContent.socialMediaPosts.map((post: SocialMediaPost, index: number) => (
                <div key={index} className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {post.platform} - {post.type}
                  </h4>
                  <div className="flex flex-col space-y-2">
                    <pre className="flex-grow p-3 bg-white border border-gray-200 rounded-md whitespace-pre-wrap text-gray-800 text-base">
                      {post.text}
                    </pre>
                    <CopyToClipboardButton
                      textToCopy={post.text}
                      label="Копировать"
                      theme="purple"
                      className="self-end w-full sm:w-auto"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Ingredients Section */}
          <div className="bg-green-50 border-l-4 border-green-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-green-800 mb-4 flex items-center">
              <span className="mr-2">📝</span> Ингредиенты
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-800 text-base">
              {generatedContent.ingredients.map((ingredient: Ingredient, index: number) => (
                <li key={index}>
                  {ingredient.name}: {ingredient.quantity} {ingredient.unit}
                </li>
              ))}
            </ul>
            <div className="mt-6 text-right">
              <CopyToClipboardButton
                textToCopy={generatedContent.ingredients
                  .map((ing) => `${ing.name}: ${ing.quantity} ${ing.unit}`)
                  .join('\n')}
                label="Копировать список"
                theme="green"
                className="self-end w-full sm:w-auto"
              />
            </div>
          </div>

          {/* 7. Instructions Section */}
          <div className="bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm p-4">
            <h3 className="text-xl md:text-2xl font-semibold text-red-800 mb-4 flex items-center">
              <span className="mr-2">👩‍🍳</span> Инструкции по приготовлению
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-gray-800 text-base">
              {generatedContent.instructions.map((instruction: string, index: number) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
            <div className="mt-6 text-right">
              <CopyToClipboardButton
                textToCopy={generatedContent.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n')}
                label="Копировать инструкцию"
                theme="red"
                className="self-end w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeGeneratorPage;