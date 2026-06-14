import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileText, Loader2, Scale, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { GeneratedDocument } from '@/types'

// =====================================================================
// MOCK DOCUMENT CONTENT
// =====================================================================
const MOCK_DOCUMENT_CONTENT = `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date last signed below
by and between:

**DISCLOSING PARTY:** Acme Technologies Private Limited, a company incorporated under the
Companies Act, 2013, having its registered office at 123 Business Park, Mumbai - 400001
("Disclosing Party"); and

**RECEIVING PARTY:** TechVentures India LLP, a limited liability partnership registered under
the Limited Liability Partnership Act, 2008, having its registered office at 456 Commercial
Complex, Bangalore - 560001 ("Receiving Party").

WHEREAS, the Disclosing Party desires to disclose certain confidential and proprietary
information to the Receiving Party for the purpose of evaluating a potential business
collaboration (the "Purpose");

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein,
and for other good and valuable consideration, the receipt and sufficiency of which are
hereby acknowledged, the parties agree as follows:

**1. DEFINITION OF CONFIDENTIAL INFORMATION**

"Confidential Information" means any data or information that is proprietary to the
Disclosing Party and not generally known to the public, whether in tangible or intangible
form, whenever and however disclosed, including, but not limited to: (i) any marketing
strategies, plans, financial information, or projections; (ii) operations, sales estimates,
business plans and performance results; (iii) any other information that should reasonably
be recognized as confidential information of the Disclosing Party.

**2. OBLIGATIONS OF RECEIVING PARTY**

The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence
and to take all reasonable precautions to protect such Confidential Information; (b) not to
disclose any such Confidential Information or any information derived therefrom to any third
person; (c) not to make any use whatsoever at any time of such Confidential Information
except to evaluate whether to enter into the proposed business relationship.

**3. TERM**

This Agreement shall remain in effect for a period of three (3) years from the date of
execution, unless earlier terminated by mutual written consent of both parties.

**4. GOVERNING LAW**

This Agreement shall be governed by and construed in accordance with the laws of India.
Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction
of the courts in Mumbai, Maharashtra.

**5. GENERAL PROVISIONS**

This Agreement constitutes the entire agreement between the parties concerning the subject
matter hereof and supersedes all prior agreements and understandings, whether written or
oral. This Agreement may not be amended except by a written instrument signed by both parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date last written below.

---

**DISCLOSING PARTY**                     **RECEIVING PARTY**

Signature: _________________             Signature: _________________
Name:      _________________             Name:      _________________
Title:     _________________             Title:     _________________
Date:      _________________             Date:      _________________
`

// =====================================================================
// DOCUMENT PREVIEW COMPONENT
// =====================================================================
interface DocumentPreviewProps {
  document?: GeneratedDocument | null
  isGenerating?: boolean
  className?: string
  onDownloadPdf?: () => void
  onDownloadDocx?: () => void
}

export default function DocumentPreview({
  document,
  isGenerating = false,
  className,
  onDownloadPdf,
  onDownloadDocx,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100)

  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf()
    } else {
      toast.success('PDF download started')
    }
  }

  const handleDownloadDocx = () => {
    if (onDownloadDocx) {
      onDownloadDocx()
    } else {
      toast.success('DOCX download started')
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">
              {document?.name ?? 'Document Preview'}
            </p>
            {document?.page_count && (
              <p className="text-[10px] text-white/35">{document.page_count} pages · {document.word_count} words</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/4 border border-white/8 rounded-lg px-1">
            <button
              onClick={() => setZoom(z => Math.max(60, z - 10))}
              className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white/70"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-white/40 font-mono w-8 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white/70"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Download Buttons */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleDownloadDocx}
            disabled={isGenerating || !document}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:text-white/80 hover:bg-white/8 transition-all disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            DOCX
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleDownloadPdf}
            disabled={isGenerating || !document}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-xs font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </motion.button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-[#0D0D14] p-6">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-10 w-10 text-blue-400" />
            </motion.div>
            <div className="text-center">
              <p className="text-white/70 font-semibold">Generating your document...</p>
              <p className="text-white/35 text-sm mt-1">This usually takes 10-20 seconds</p>
            </div>
            {/* Fake progress */}
            <div className="w-64 h-1 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: ['0%', '85%'] }}
                transition={{ duration: 15, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              />
            </div>
          </div>
        ) : (
          <div
            className="mx-auto"
            style={{ maxWidth: '700px', transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Paper */}
            <div className="bg-white rounded-sm shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-center py-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Generated by LawBot
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="px-12 py-10">
                <div
                  className="prose prose-sm max-w-none text-gray-800 leading-7"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {MOCK_DOCUMENT_CONTENT.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**') && !line.includes(' ')) {
                      return (
                        <h2 key={i} className="text-sm font-bold text-gray-900 mt-6 mb-2 uppercase tracking-wide">
                          {line.replace(/\*\*/g, '')}
                        </h2>
                      )
                    }
                    if (line.startsWith('---')) {
                      return <hr key={i} className="my-6 border-gray-200" />
                    }
                    if (!line.trim()) return <br key={i} />

                    // Handle bold text within lines
                    const parts = line.split(/(\*\*.*?\*\*)/)
                    return (
                      <p key={i} className="mb-3 text-sm text-gray-700 leading-7">
                        {parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={j} className="font-bold text-gray-900">
                              {part.replace(/\*\*/g, '')}
                            </strong>
                          ) : (
                            part
                          ),
                        )}
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
