"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileUp, FileDown, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { apiClient } from "@/lib/api"

interface BulkImportProps {
  onSuccess: () => void
}

export function BulkImport({ onSuccess }: BulkImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".xlsx")
      ) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Please select a valid Excel (.xlsx) file.")
        setFile(null)
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true)
      const blob = await apiClient.downloadInventoryTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "inventory_template.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError("Failed to download template. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)
      setImportResults(null)

      const response = await apiClient.importProducts(file)
      setImportResults(response.results)
      
      if (response.results.success > 0) {
        onSuccess()
      }
      
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setError(null)
    setImportResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetState()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileUp className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Inventory</DialogTitle>
          <DialogDescription>
            Upload an Excel file to add or update multiple products at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">1. Download Template</h4>
            <p className="text-xs text-muted-foreground">
              Use our sample template to ensure your data is formatted correctly.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Download Excel Template
            </Button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <h4 className="text-sm font-medium">2. Upload Inventory List</h4>
            <p className="text-xs text-muted-foreground">
              Select your completed Excel file to start importing.
            </p>
            <div className="mt-2">
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                {file ? (
                  <span className="text-sm font-medium text-primary">{file.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground text-center">
                    Click to browse or drag and drop<br />Excel (.xlsx) files only
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importResults && (
            <div className="space-y-3">
              <Alert variant={importResults.failed === 0 ? "default" : "destructive"} className={importResults.failed === 0 ? "bg-green-50 border-green-200 text-green-800" : ""}>
                {importResults.failed === 0 ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertTitle>Import Results</AlertTitle>
                <AlertDescription>
                  Successfully imported {importResults.success} products. 
                  {importResults.failed > 0 && ` Failed to import ${importResults.failed} products.`}
                </AlertDescription>
              </Alert>
              
              {importResults.errors.length > 0 && (
                <div className="max-h-[150px] overflow-y-auto text-xs space-y-1 border rounded p-2 bg-muted/30">
                  <p className="font-semibold mb-1">Errors:</p>
                  {importResults.errors.map((err, i) => (
                    <div key={i} className="text-destructive">• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Start Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
