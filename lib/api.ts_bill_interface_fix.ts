export interface Bill {
  _id: string
  billNumber: string
  customer?: {
    name?: string
    phone?: string
    address?: string
    gstNumber?: string
  }
  items: Array<{
    product: string
    productCode: string
    productName: string
    variantSku?: string
    variantSize?: string
    size?: string
    quantity: number
    rate: number
    taxRate: number
    amount: number
    taxAmount: number
    totalAmount: number
    discount?: {
      discountId: string
      discountName: string
      discountType: "percentage" | "fixed"
      discountValue: number
      discountAmount: number
    }
  }>
  subtotal: number
  totalDiscount: number
  totalTax: number
  roundOff: number
  grandTotal: number
  cashTendered: number
  changeDue: number
  paymentMethod: "cash" | "card" | "upi" | "mixed"
  paymentDetails?: {
    razorpayPaymentId?: string
    razorpayOrderId?: string
    razorpaySignature?: string
    cardLast4?: string
    cardType?: string
    upiId?: string
    paymentStatus?: "pending" | "completed" | "failed" | "refunded"
  }
  paymentBreakdown?: Array<{
    method: "cash" | "card" | "upi"
    amount: number
    details?: {
      razorpayPaymentId?: string
      razorpayOrderId?: string
      razorpaySignature?: string
      cardLast4?: string
      cardType?: string
      upiId?: string
    }
  }>
  loyaltyDiscount?: {
    discountId: string
    discountName: string
    discountType: string
    discountValue: number
    discountAmount: number
  }
  cashier: string
  cashierName: string
  shift?: string
  status: "completed" | "cancelled" | "refunded"
  createdAt: string
  updatedAt: string
  type: "bill" | "challan"
}
