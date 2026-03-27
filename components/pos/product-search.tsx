"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Barcode, Plus } from "lucide-react"
import { apiClient, type Product, type ProductVariant } from "@/lib/api"
import { isTamilText, cn } from "@/lib/utils"

interface ProductSearchProps {
  onProductSelect: (product: Product, variant: ProductVariant) => Promise<void>
}

export function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([])
        setShowResults(false)
        return
      }

      setIsLoading(true)
      try {
        const products = await apiClient.getProducts({ search: searchTerm, active: true })
        setSearchResults(products.slice(0, 10)) // Limit to 10 results
        setShowResults(true)
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const handleProductSelect = async (product: Product, variant: ProductVariant) => {
    await onProductSelect(product, variant)
    setSearchTerm("")
    setShowResults(false)
  }

  const handleBarcodeSearch = async () => {
    if (!searchTerm) return

    try {
      setIsLoading(true)
      // Try to find by SKU first (for variants)
      const product = await apiClient.getProductByIdentifier(searchTerm)
      if (product.variants && product.variants.length > 0) {
        // Find the variant that matches the barcode/SKU
        const matchingVariant = product.variants.find(v => 
          v.sku === searchTerm.toUpperCase() || v.barcode === searchTerm
        )
        if (matchingVariant) {
          handleProductSelect(product, matchingVariant)
        } else {
          // Default to first variant
          handleProductSelect(product, product.variants[0])
        }
      } else {
        // Fallback for old product structure
        handleProductSelect(product, {
          size: "Default",
          price: product.basePrice || 0,
          cost: product.baseCost || 0,
          stock: 0, // No stock at product level anymore
          sku: product.code,
          isActive: true
        })
      }
    } catch (error) {
      console.error("Barcode search error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products by name, code, or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            onFocus={() => {
              // Sync state with DOM in case it was updated externally (e.g. from pos-billing fallback)
              const currentVal = (document.querySelector('input[placeholder*="Search products"]') as HTMLInputElement)?.value;
              if (currentVal && currentVal !== searchTerm) {
                setSearchTerm(currentVal);
              }
              if (searchTerm.length >= 2) setShowResults(true);
            }}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleBarcodeSearch} 
          disabled={isLoading || !searchTerm}
          className="flex gap-2"
        >
          <Barcode className="h-4 w-4" />
          <span className="hidden sm:inline">By Code</span>
        </Button>
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {searchResults.map((product) => (
              <div key={product._id} className="border-b last:border-b-0">
                {/* Product Header */}
                <div className="flex items-center justify-between p-3 bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", isTamilText(product.name) && "font-sathayam text-lg")}>
                        {product.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {product.code}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <span className={cn(isTamilText(product.category) && "font-sathayam")}>
                        {product.category}
                      </span>
                      <span>•</span>
                      <span>{product.unit}</span>
                    </div>
                  </div>
                </div>
                
                {/* Product Variants */}
                <div className="p-2 space-y-1">
                  {(product.variants || []).map((variant, index) => (
                    <div
                      key={`${product._id}-${variant.sku || index}`}
                      className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded"
                      onClick={() => handleProductSelect(product, variant)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{variant.size}</span>
                          <Badge variant="secondary" className="text-xs">
                            {variant.sku}
                          </Badge>
                          {!variant.isActive && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {variant.stock} {product.unit}
                          {variant.barcode && ` • Barcode: ${variant.barcode}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{formatCurrency(variant.price)}</div>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
