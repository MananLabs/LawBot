import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, CheckCircle2, AlertCircle, FileText, FileImage } from 'lucide-react'
import { cn } from '@/lib/utils'

// =====================================================================
// FILE TYPE ICONS
// =====================================================================
function getFileIcon(mime: string) {
  if (mime.includes('pdf')) return FileText
  if (mime.includes('image')) return FileImage
  return File
}

// =====================================================================
// FORMAT FILE SIZE
// =====================================================================
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// =====================================================================
// FILE ITEM
// =====================================================================
interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

function FileItem({
  item,
  onRemove,
}: {
  item: UploadedFile
  onRemove: (id: string) => void
}) {
  const Icon = getFileIcon(item.file.type)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8"
    >
      {/* File Icon */}
      <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-white/30">{formatSize(item.file.size)}</span>
          {item.status === 'uploading' && (
            <span className="text-xs text-blue-400">{item.progress}%</span>
          )}
          {item.status === 'error' && (
            <span className="text-xs text-red-400">{item.error ?? 'Upload failed'}</span>
          )}
          {item.status === 'complete' && (
            <span className="text-xs text-green-400">Ready</span>
          )}
        </div>

        {/* Progress Bar */}
        {item.status === 'uploading' && (
          <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Status / Remove */}
      <div className="shrink-0">
        {item.status === 'complete' && (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        )}
        {item.status === 'error' && (
          <AlertCircle className="h-5 w-5 text-red-400" />
        )}
        {item.status === 'uploading' && (
          <button
            onClick={() => onRemove(item.id)}
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {(item.status === 'complete' || item.status === 'error') && (
          <button
            onClick={() => onRemove(item.id)}
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-all ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// =====================================================================
// FILE UPLOAD ZONE
// =====================================================================
interface FileUploadZoneProps {
  accept?: string
  maxSize?: number // bytes
  maxFiles?: number
  onFilesSelected?: (files: File[]) => void
  onFileRemoved?: (id: string) => void
  className?: string
  disabled?: boolean
  hint?: string
}

export default function FileUploadZone({
  accept = '.pdf,.docx,.doc,.txt',
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 5,
  onFilesSelected,
  className,
  disabled = false,
  hint,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const arr = Array.from(incoming)

      if (files.length + arr.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const valid: File[] = []
      for (const file of arr) {
        if (file.size > maxSize) {
          setError(`"${file.name}" exceeds ${formatSize(maxSize)} limit`)
          continue
        }
        valid.push(file)
      }

      if (valid.length === 0) return

      const newItems: UploadedFile[] = valid.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'uploading',
      }))

      setFiles((prev) => [...prev, ...newItems])
      onFilesSelected?.(valid)

      // Simulate upload progress
      newItems.forEach((item) => {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 20 + 5
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, progress: 100, status: 'complete' } : f,
              ),
            )
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, progress: Math.floor(progress) } : f,
              ),
            )
          }
        }, 200)
      })
    },
    [files.length, maxFiles, maxSize, onFilesSelected],
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <motion.div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        animate={
          isDragOver
            ? { scale: 1.01, borderColor: 'rgba(59, 130, 246, 0.6)' }
            : { scale: 1, borderColor: 'rgba(255,255,255,0.08)' }
        }
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors overflow-hidden',
          isDragOver ? 'bg-blue-500/8' : 'bg-white/2 hover:bg-white/4',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Animated dashed border */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl border-2 border-blue-500/60"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(6,182,212,0.04) 100%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          animate={isDragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex justify-center mb-4"
        >
          <div
            className={cn(
              'h-14 w-14 rounded-2xl flex items-center justify-center transition-colors',
              isDragOver
                ? 'bg-blue-500/20 shadow-lg shadow-blue-500/20'
                : 'bg-white/5',
            )}
          >
            <Upload
              className={cn('h-7 w-7 transition-colors', isDragOver ? 'text-blue-400' : 'text-white/30')}
              strokeWidth={1.5}
            />
          </div>
        </motion.div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold text-white/70 mb-1">
            {isDragOver ? 'Drop files here' : 'Drop files or click to browse'}
          </p>
          <p className="text-xs text-white/35">
            {hint ?? `Supports ${accept.replace(/\./g, '').toUpperCase()} · Max ${formatSize(maxSize)} per file · Up to ${maxFiles} files`}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {files.map((item) => (
              <FileItem key={item.id} item={item} onRemove={removeFile} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
