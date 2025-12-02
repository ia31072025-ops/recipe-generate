import React, { useState } from 'react';
import { ThemeColor } from '../types';

interface CopyToClipboardButtonProps {
  textToCopy: string;
  label: string;
  className?: string;
  theme: ThemeColor;
}

const colorClasses: Record<ThemeColor, string> = {
  blue: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
  purple: 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500',
  green: 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
  red: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
};

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({
  textToCopy,
  label,
  className,
  theme,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses[theme]} ${className || ''}`}
    >
      {copied ? 'Скопировано!' : label}
    </button>
  );
};

export default CopyToClipboardButton;