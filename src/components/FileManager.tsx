import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { formatTimeAgo } from "../lib/utils";

export default function FileManager() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const files = useQuery(
    api.files.list,
    loggedInUser ? { userId: loggedInUser._id } : "skip"
  );

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.save);
  const deleteFile = useMutation(api.files.delete);
  const getFileUrl = useMutation(api.files.getUrl);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    setIsUploading(true);
    
    try {
      for (const file of filesToUpload) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} er for stor (max 10MB)`);
          continue;
        }

        // Generate upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const { storageId } = await result.json();

        // Save file metadata
        await saveFile({
          name: file.name,
          type: file.type,
          size: file.size,
          storageId,
        });

        toast.success(`${file.name} uploadet!`);
      }
    } catch (error: any) {
      toast.error(error.message || "Upload fejlede");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Slet ${fileName}?`)) return;

    try {
      await deleteFile({ fileId: fileId as any });
      toast.success("Fil slettet");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke slette fil");
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const url = await getFileUrl({ fileId: file._id });
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error: any) {
      toast.error("Kunne ikke downloade fil");
    }
  };

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Slet ${selectedFiles.length} valgte filer?`)) return;

    try {
      for (const fileId of selectedFiles) {
        await deleteFile({ fileId: fileId as any });
      }
      setSelectedFiles([]);
      toast.success(`${selectedFiles.length} filer slettet`);
    } catch (error: any) {
      toast.error("Kunne ikke slette filer");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📋';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    return '📁';
  };

  if (!loggedInUser) {
    return <div>Indlæser...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">📁 Filer</h2>
          <p className="text-gray-600">Upload og administrer dine studiefiler</p>
        </div>
        <div className="flex space-x-3">
          {selectedFiles.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Slet valgte ({selectedFiles.length})
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? "Uploader..." : "📤 Upload filer"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
      />

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-4xl mb-2">📤</div>
        <p className="text-lg font-medium text-gray-900 mb-1">
          Træk filer hertil eller klik for at uploade
        </p>
        <p className="text-sm text-gray-500">
          Understøtter PDF, Word, Excel, PowerPoint, billeder og mere (max 10MB per fil)
        </p>
      </div>

      {/* Files Grid */}
      {files && files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file._id}
              className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                selectedFiles.includes(file._id) ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file._id)}
                    onChange={() => handleSelectFile(file._id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-2xl">{getFileIcon(file.type)}</span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDelete(file._id, file.name)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Slet"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mb-1 truncate" title={file.name}>
                {file.name}
              </h3>
              
              <div className="text-sm text-gray-500 space-y-1">
                <div>{formatFileSize(file.size)}</div>
                <div>Uploadet {formatTimeAgo(file.uploadedAt)}</div>
              </div>

              {file.noteId && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Tilknyttet note
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen filer endnu</h3>
          <p className="text-gray-600 mb-4">Upload dine første studiefiler for at komme i gang</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload filer
          </button>
        </div>
      )}

      {/* Storage Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">Lagerplads</h4>
            <p className="text-sm text-gray-600">
              {files ? files.length : 0} filer • {
                files ? formatFileSize(files.reduce((sum, file) => sum + file.size, 0)) : '0 Bytes'
              } brugt
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Max 10MB per fil
          </div>
        </div>
      </div>
    </div>
  );
}
