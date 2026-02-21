import { useState } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { upload as uploadApi } from '../lib/api';

interface FileUploadProps {
  label: string;
  onUploadComplete: (url: string) => void;
  accept?: string;
  existingUrl?: string;
}

export default function FileUpload({ label, onUploadComplete, accept = 'image/*,application/pdf', existingUrl }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(existingUrl);
  const [error, setError] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await uploadApi.uploadPublicFile(file);

      // Try common response fields for the uploaded file URL
      const url = (result && (result.url || result.file_url || result.public_url || result.path || result.data?.url)) || '';

      if (!url) {
        console.error('Upload result did not contain a URL:', result);
        setError('Failed to upload file');
      } else {
        setUploadedUrl(url);
        onUploadComplete(url);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <Upload className="w-4 h-4 mr-2" />
          <span className="text-sm">{uploading ? 'Uploading...' : 'Choose File'}</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept={accept}
            disabled={uploading}
          />
        </label>
        {uploadedUrl && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="ml-1 text-sm">Uploaded</span>
          </div>
        )}
        {error && (
          <div className="flex items-center text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="ml-1 text-sm">{error}</span>
          </div>
        )}
      </div>
      {uploadedUrl && (
        <a
          href={uploadedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          View uploaded file
        </a>
      )}
    </div>
  );
}
