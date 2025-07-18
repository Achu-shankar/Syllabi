import React from 'react';
import { FileText, Link, Youtube, File as FallbackFileIcon, FileImage, FileVideo, FileAudio, FileCode, Archive } from 'lucide-react';

interface FileIconProps {
  sourceType: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ sourceType, className = 'h-5 w-5' }) => {
  const getIconWithColor = () => {
    switch (sourceType.toLowerCase()) {
      case 'pdf':
        return <FileText className={`${className} text-red-500`} />;
      case 'doc':
      case 'docx':
        return <FileText className={`${className} text-blue-600`} />;
      case 'txt':
      case 'text':
        return <FileText className={`${className} text-gray-600`} />;
      case 'url':
      case 'link':
        return <Link className={`${className} text-blue-500`} />;
      case 'youtube':
        return <Youtube className={`${className} text-red-600`} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'image':
        return <FileImage className={`${className} text-green-500`} />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'video':
        return <FileVideo className={`${className} text-purple-500`} />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'audio':
        return <FileAudio className={`${className} text-orange-500`} />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
      case 'code':
        return <FileCode className={`${className} text-indigo-500`} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'archive':
        return <Archive className={`${className} text-yellow-600`} />;
      default:
        return <FallbackFileIcon className={`${className} text-gray-500`} />;
    }
  };

  return getIconWithColor();
}; 