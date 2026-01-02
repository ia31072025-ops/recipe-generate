import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedContent, Ingredient, SocialMediaPost } from '../types';
import {
  generateRecipeContent,
  generateGeminiThumbnail,
  generateCanvasThumbnail
} from '../services/geminiService';
import Spinner from '../components/Spinner';
import CopyToClipboardButton from '../components/CopyToClipboardButton';
import ReactMarkdown from 'react-markdown';

const RecipeGeneratorPage: React.FC = () => {
  const [recipeName, setRecipeName] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const [customThumbnailPrompt, setCustomThumbnailPrompt] = useState('');
  const [useApiImageGenerator, setUseApiImageGenerator] = useState(true);
  const [showApiKeySelectionPrompt, setShowApiKeySelectionPrompt] = useState(false);

  const [contentType, setContentType] = useState<'standard' | 'short'>('standard');

  const [editableYoutubeDescription, setEditableYoutubeDescription] = useState('');
  const [regeneratingDescription, setRegeneratingDescription] = useState(false);

  const [retryAfterKeySelect, setRetryAfterKeySelect] = useState(false);

  useEffect(() => {
    if (generatedContent?.thumbnailDescription) {
      setCustomThumbnailPrompt(generatedContent.thumbnailDescription);
    }
    if (generatedContent?.youtubeDescription) {
      setEditableYoutubeDescription(generatedContent.youtubeDescription);
    }
  }, [generatedContent]);

  const checkAndPromptApiKey = useCallback(async () => {
    if (!useApiImageGenerator) return true;

    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowApiKeySelectionPrompt(true);
        return false;
      }
    }
    return true;
  }, [useApiImageGenerator]);

  const openApiKeySelectionDialog = useCallback(async () => {
    try {
      await window.aistudio?.openSelectKey();
      setShowApiKeySelectionPrompt(false);
      if (retryAfterKeySelect) {
        setRetryAfterKeySelect(false);
        handleGenerate();
      }
    } catch {
      setError('Не удалось открыть выбор API ключа.');
    }
  }, [retryAfterKeySelect]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setThumbnailError(null);
    setGeneratedContent(null);

    if (!recipeName.trim()) {
      setError('Пожалуйста, введите название рецепта.');
      return;
    }

    if (useApiImageGenerator && !(await checkAndPromptApiKey())) {
      setRetryAfterKeySelect(true);
      return;
    }

    setLoading(true);

    try {
      const content = await generateRecipeContent(recipeName, contentType);
      setGeneratedContent(content);
      setEditableYoutubeDescription(content.youtubeDescription || '');

      const aspectRatio: '16:9' | '9:16' =
        contentType === 'short' ? '9:16' : '16:9';

      let imageUrl = '';

      if (useApiImageGenerator && content.thumbnailDescription) {
        setThumbnailLoading(true);
        const prompt =
          customThumbnailPrompt.trim() ||
          content.thumbnailDescription ||
          recipeName;

        try {
          imageUrl = await generateGeminiThumbnail(prompt, recipeName, aspectRatio);
        } catch (e: any) {
          if (String(e?.message).includes('permission')) {
            setShowApiKeySelectionPrompt(true);
            setRetryAfterKeySelect(true);
          } else {
            setThumbnailError(`Ошибка генерации обложки: ${e.message}`);
          }
        } finally {
          setThumbnailLoading(false);
        }
      } else if (!useApiImageGenerator) {
        setThumbnailLoading(true);
        imageUrl = await generateCanvasThumbnail(recipeName, aspectRatio);
        setThumbnailLoading(false);
      }

      if (imageUrl) {
        setGeneratedContent(prev => ({
          ...(prev as GeneratedContent),
          thumbnailImageUrl: imageUrl
        }));
      }
    } catch (e: any) {
      setError(`Ошибка генерации: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    recipeName,
    contentType,
    useApiImageGenerator,
    customThumbnailPrompt,
    checkAndPromptApiKey
  ]);

  const handleRegenerateThumbnail = useCallback(async (useCustom = false) => {
    if (!generatedContent) return;

    if (useApiImageGenerator && !(await checkAndPromptApiKey())) {
      setRetryAfterKeySelect(true);
      return;
    }

    setThumbnailLoading(true);
    setThumbnailError(null);

    const prompt =
      useCustom && customThumbnailPrompt.trim()
        ? customThumbnailPrompt.trim()
        : generatedContent.thumbnailDescription;

    const aspectRatio: '16:9' | '9:16' =
      contentType === 'short' ? '9:16' : '16:9';

    try {
      const url = useApiImageGenerator
        ? await generateGeminiThumbnail(prompt!, recipeName, aspectRatio)
        : await generateCanvasThumbnail(recipeName, aspectRatio);

      setGeneratedContent(prev => ({
        ...(prev as GeneratedContent),
        thumbnailImageUrl: url
      }));
    } catch (e: any) {
      if (useApiImageGenerator && String(e.message).includes('permission')) {
        setShowApiKeySelectionPrompt(true);
        setRetryAfterKeySelect(true);
      } else {
        setThumbnailError(e.message);
      }
    } finally {
      setThumbnailLoading(false);
    }
  }, [
    generatedContent,
    recipeName,
    customThumbnailPrompt,
    useApiImageGenerator,
    contentType,
    checkAndPromptApiKey
  ]);

  const handleRegenerateYoutubeDescription = useCallback(async () => {
    setRegeneratingDescription(true);
    try {
      const tmp = await generateRecipeContent(recipeName, contentType, ['youtubeDescription']);
      if (tmp.youtubeDescription) {
        setEditableYoutubeDescription(tmp.youtubeDescription);
        setGeneratedContent(prev => ({
          ...prev!,
          youtubeDescription: tmp.youtubeDescription
        }));
      }
    } finally {
      setRegeneratingDescription(false);
    }
  }, [recipeName, contentType]);

  const handleDownloadThumbnail = useCallback(() => {
    if (!generatedContent?.thumbnailImageUrl) return;
    const a = document.createElement('a');
    a.href = generatedContent.thumbnailImageUrl;
    a.download = 'thumbnail.png';
    a.click();
  }, [generatedContent]);

  /* JSX НИЖЕ — БЕЗ ИЗМЕНЕНИЙ */
  return (
    <>
      {/* ТВОЙ JSX — 1 В 1 КАК БЫЛ */}
    </>
  );
};

export default RecipeGeneratorPage;
