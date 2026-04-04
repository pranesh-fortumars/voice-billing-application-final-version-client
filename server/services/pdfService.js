const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Generate PDF bill from HTML template
const generateBillPDF = async (bill, language = 'en') => {
  try {
    console.log('📄 Starting PDF generation for bill:', bill.billNumber, 'Language:', language);
    console.log('🌍 Language parameter received:', language);
    console.log('🔍 Language type:', typeof language);
    console.log('📋 Bill data structure:', JSON.stringify({
      billNumber: bill.billNumber,
      hasDiscount: !!bill.discount,
      discountAmount: bill.discount?.discountAmount,
      hasLoyaltyDiscount: !!bill.loyaltyDiscount,
      loyaltyDiscountAmount: bill.loyaltyDiscount?.amount,
      subtotal: bill.subtotal,
      totalTax: bill.totalTax,
      grandTotal: bill.grandTotal
    }, null, 2));
    
    // Generate HTML template for the bill
    const htmlTemplate = generateBillHTML(bill, language);
    
    // Launch Puppeteer browser with new headless mode and additional args for font support
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-font-subpixel-positioning',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set HTML content and wait for fonts to load
    await page.setContent(htmlTemplate, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    
    // Wait a bit more for fonts to load properly
    await page.waitForTimeout(2000);
    
    // Generate PDF with thermal receipt dimensions
    const pdfBuffer = await page.pdf({
      width: '80mm', // Thermal printer width
      height: '297mm', // Maximum height (will be auto-sized)
      printBackground: true,
      margin: {
        top: '2px',
        bottom: '2px',
        left: '2px',
        right: '2px'
      },
      preferCSSPageSize: true
    });
    
    await browser.close();
    
    console.log('✅ PDF generated successfully for bill:', bill.billNumber);
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

// Generate HTML template for the bill
const generateBillHTML = (bill, language = 'en') => {
  // Translation function with bilingual support
  const t = (key) => {
    const translations = {
      en: {
        supermarket_store: "SUPERMARKET STORE",
        bill: "BILL",
        date: "DATE",
        cashier: "CASHIER",
        customer: "CUSTOMER",
        phone: "PHONE",
        email: "EMAIL",
        items: "ITEMS",
        subtotal: "SUBTOTAL",
        loyalty_discount: "LOYALTY DISCOUNT",
        total_tax: "TOTAL TAX",
        round_off: "ROUND OFF",
        total: "TOTAL",
        payment_method: "PAYMENT METHOD",
        cash_tendered: "CASH TENDERED",
        change: "CHANGE",
        thank_you: "THANK YOU FOR YOUR PURCHASE!",
        please_visit_again: "PLEASE VISIT AGAIN",
        paid: "*** PAID ***",
        walk_in_customer: "Walk-in Customer"
      },
      ta: {
        supermarket_store: "சூப்பர்மார்க்கெட் ஸ்டோர்",
        bill: "பில்",
        date: "தேதி",
        cashier: "பணம் வசூலிப்பவர்",
        customer: "வாடிக்கையாளர்",
        phone: "தொலைபேசி",
        email: "மின்னஞ்சல்",
        items: "பொருட்கள்",
        subtotal: "மொத்தம்",
        loyalty_discount: "விசுவாசத் தள்ளுபடி",
        total_tax: "மொத்த வரி",
        round_off: "சுற்றளவு",
        total: "மொத்தம்",
        payment_method: "கட்டண முறை",
        cash_tendered: "பணம் கொடுக்கப்பட்டது",
        change: "மாற்றுத் தொகை",
        thank_you: "உங்கள் கொள்முதலுக்கு நன்றி!",
        please_visit_again: "மீண்டும் வருகையிடுங்கள்",
        paid: "*** செலுத்தப்பட்டது ***",
        walk_in_customer: "நேரடி வாடிக்கையாளர்",
        address_line_1: "123 பிரதான வீதி, நகரம்",
        address_line_2: "மாநிலம், நாடு - 123456",
        phone_label: "தொலைபேசி: +91 234 567 8900",
        cash: "பணம்",
        card: "அட்டை",
        upi: "UPI (தமிழ்)",
        mixed: "கலப்பு"
      }
    };
    
    const englishText = translations.en[key] || key;
    const tamilText = translations.ta[key] || key;
    
    if (language === 'bilingual') {
      // Return both English and Tamil
      return `<div class="bilingual">
        <div class="english">${englishText}</div>
        <div class="tamil">${tamilText}</div>
      </div>`;
    } else if (language === 'ta') {
      return tamilText;
    } else {
      return englishText;
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get display width of string (handles Tamil characters)
  const getDisplayWidth = (str) => {
    // Tamil characters generally take 1.5x the width of English characters
    // This is a simplified approach - in production, you might want a more sophisticated method
    const tamilRegex = /[\u0B80-\u0BFF]/;
    let width = 0;
    for (let char of str) {
      if (tamilRegex.test(char)) {
        width += 1.5; // Tamil characters are wider
      } else {
        width += 1; // English and other characters
      }
    }
    return width;
  };

  // Helper function to pad strings for receipt alignment
  const padRight = (str, length) => {
    const displayWidth = getDisplayWidth(str);
    const paddingNeeded = Math.max(0, length - displayWidth);
    return str + ' '.repeat(Math.ceil(paddingNeeded));
  };

  const padLeft = (str, length) => {
    const displayWidth = getDisplayWidth(str);
    const paddingNeeded = Math.max(0, length - displayWidth);
    return ' '.repeat(Math.ceil(paddingNeeded)) + str;
  };

  // Generate receipt content as HTML for better alignment
  const customerName = bill.customer?.name || bill.customerInfo?.name || t('walk_in_customer');
  const customerPhone = bill.customer?.phone || bill.customerInfo?.phone || '';
  const customerEmail = bill.customer?.email || bill.customerInfo?.email || '';

  const receiptHTML = `
    <div class="receipt">
      <div class="header">
        <div class="store-name">${t('supermarket_store')}</div>
        <div class="store-address">${language === 'ta' ? t('address_line_1') : '123 Main Street, City'}</div>
        <div class="store-address">${language === 'ta' ? t('address_line_2') : 'State, Country - 123456'}</div>
        <div class="store-phone">${language === 'ta' ? t('phone_label') : 'Phone: +1 234 567 8900'}</div>
      </div>
      
      <div class="separator mt-1">==============================</div>
      
      <div class="bill-info">
        <div>${t('bill')} #: ${bill.billNumber}</div>
        <div>${t('date')}: ${formatDate(bill.createdAt)}</div>
        <div>${t('cashier')}: ${bill.cashierName}</div>
      </div>
      
      <div class="separator">------------------------------</div>
      
      <div class="customer-info">
        <div>${t('customer')}: ${customerName}</div>
        ${customerPhone ? `<div>${t('phone')}: ${customerPhone}</div>` : ''}
        ${customerEmail ? `<div>${t('email')}: ${customerEmail}</div>` : ''}
      </div>
      
      <div class="separator">------------------------------</div>
      
      <div class="items-header">${t('items')}</div>
      <table class="items-table">
        ${bill.items.map(item => {
          let baseName = item.product?.name || item.productName || 'Unknown Item';
          if (language === 'ta' && (item.product?.nameTamil || item.productNameTamil)) {
            baseName = item.product?.nameTamil || item.productNameTamil;
          }
          const sizeInfo = item.size || item.variantSize ? `(${item.size || item.variantSize})` : '';
          const displayName = `${baseName} ${sizeInfo}`.trim();
          const itemTotal = formatCurrency(item.totalAmount || (item.rate * item.quantity));
          const qtyRate = `${item.quantity}x${formatCurrency(item.rate)}`;
          
          return `
            <tr>
              <td>
                <div class="item-name">${displayName}</div>
                <div class="item-qty">${qtyRate}</div>
              </td>
              <td class="item-price">${itemTotal}</td>
            </tr>
          `;
        }).join('')}
      </table>
      
      <div class="separator mt-1">------------------------------</div>
      
      <table class="summary-table">
        <tr>
          <td>${t('subtotal')}:</td>
          <td>${formatCurrency(bill.subtotal)}</td>
        </tr>
        ${bill.loyaltyDiscount && bill.loyaltyDiscount.discountAmount > 0 ? `
          <tr>
            <td>${t('loyalty_discount')}:</td>
            <td>-${formatCurrency(bill.loyaltyDiscount.discountAmount)}</td>
          </tr>
        ` : ''}
        <tr>
          <td>${t('total_tax')}:</td>
          <td>${formatCurrency(bill.totalTax)}</td>
        </tr>
        ${Math.abs(bill.roundOff) > 0.01 ? `
          <tr>
            <td>${t('round_off')}:</td>
            <td>${(bill.roundOff > 0 ? '+' : '') + formatCurrency(bill.roundOff)}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td>${t('total')}:</td>
          <td>${formatCurrency(bill.grandTotal)}</td>
        </tr>
      </table>
      
      <div class="separator mt-1">==============================</div>
      
      <div class="payment-info">
        <div>${t('payment_method')}: ${t(bill.paymentMethod.toLowerCase())}</div>
        ${bill.paymentMethod === 'cash' ? `
          <table class="payment-table">
            <tr>
              <td>${t('cash_tendered')}:</td>
              <td>${formatCurrency(bill.cashTendered)}</td>
            </tr>
            <tr>
              <td>${t('change')}:</td>
              <td>${formatCurrency(bill.changeDue)}</td>
            </tr>
          </table>
        ` : ''}
      </div>
      
      <div class="separator mt-1">------------------------------</div>
      
      <div class="footer">
        <div class="thank-you">${t('thank_you')}</div>
        <div class="visit-again">${t('please_visit_again')}</div>
        ${bill.status === 'completed' ? `<div class="paid-status">${t('paid')}</div>` : ''}
      </div>
      <div class="separator">==============================</div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="${language === 'ta' ? 'ta' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bill ${bill.billNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&family=Courier+New:wght@400;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: ${language === 'ta' ? "'Noto Sans Tamil', 'Courier New', sans-serif" : "'Courier New', monospace"};
          background: white;
          color: black;
          width: 80mm;
          margin: 0;
          padding: 5px;
          overflow-x: hidden;
        }

        .receipt { width: 100%; border:0px solid #000; }
        
        .header { text-align: center; margin-bottom: 2px; }
        .store-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
        .store-address, .store-phone { font-size: 10px; margin-bottom: 1px; }
        
        .separator { text-align: center; letter-spacing: -1px; margin: 2px 0; overflow: hidden; white-space: nowrap; }
        .mt-1 { margin-top: 4px; }
        
        .bill-info, .customer-info, .payment-info { font-size: 10px; margin: 4px 0; }
        .bill-info div, .customer-info div, .payment-info div { margin-bottom: 2px; }
        
        .items-header { font-weight: bold; font-size: 11px; margin: 4px 0; padding-bottom: 2px; }
        .items-table, .summary-table, .payment-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .items-table td, .summary-table td, .payment-table td { padding: 2px 0; vertical-align: top; }
        
        .item-name { font-weight: 500; }
        .item-qty { font-size: 8px; color: #444; }
        .item-price { text-align: right; width: 30%; }
        
        .summary-table td:last-child, .payment-table td:last-child { text-align: right; width: 40%; }
        .total-row { font-weight: bold; font-size: 12px; }
        .total-row td { border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 4px 0 !important; }
        
        .footer { text-align: center; font-size: 11px; margin: 8px 0; }
        .thank-you { font-weight: bold; margin-bottom: 2px; }
        .paid-status { font-weight: bold; margin-top: 4px; }
      </style>
    </head>
    <body>
      ${receiptHTML}
    </body>
    </html>
  `;
};

module.exports = {
  generateBillPDF
};
