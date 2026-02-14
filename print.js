// ===== Thermal Printer Support =====
// 58mm / 80mm थर्मल प्रिंटर साठी QR कोड प्रिंट

// Print Single QR Code
function printSingleQR(accNo) {
    const qrItem = document.getElementById('qr-' + accNo);
    if (!qrItem) {
        showNotification('QR कोड आधी तयार करा', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Print - ${accNo}</title>
            <style>
                body {
                    margin: 0;
                    padding: 5px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }
                .qr-print {
                    width: 58mm;
                    margin: 0 auto;
                    padding: 3mm;
                    text-align: center;
                }
                .qr-print img {
                    width: 40mm;
                    height: 40mm;
                }
                .qr-print .label {
                    font-size: 8pt;
                    font-weight: bold;
                    margin-top: 2mm;
                    word-break: break-word;
                }
                .qr-print .sublabel {
                    font-size: 6pt;
                    color: #555;
                }
                .college-name {
                    font-size: 6pt;
                    margin-bottom: 2mm;
                }
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                }
            </style>
        </head>
        <body>
            <div class="qr-print">
                <div class="college-name">DAMC Library, Udgir</div>
                ${qrItem.querySelector('canvas') ?
                    `<img src="${qrItem.querySelector('canvas').toDataURL()}" />` :
                    qrItem.querySelector('div[id^="qrcode"]').innerHTML
                }
                <div class="label">${qrItem.querySelector('p').textContent}</div>
                <div class="sublabel">${qrItem.querySelector('small')?.textContent || ''}</div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
        </html>
    `);
}

// Print Batch QR Codes (Multiple per page for thermal printer)
function printQRBatch() {
    const qrItems = document.querySelectorAll('.qr-item');
    if (qrItems.length === 0) {
        showNotification('कृपया आधी QR कोड तयार करा', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    let qrHTML = '';

    qrItems.forEach(item => {
        const canvas = item.querySelector('canvas');
        const imgSrc = canvas ? canvas.toDataURL() : '';
        const label = item.querySelector('p')?.textContent || '';
        const sublabel = item.querySelector('small')?.textContent || '';

        qrHTML += `
            <div class="qr-print-item">
                <div class="college-name">DAMC Library</div>
                ${imgSrc ? `<img src="${imgSrc}" />` : ''}
                <div class="label">${label}</div>
                <div class="sublabel">${sublabel}</div>
            </div>
        `;
    });

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Batch Print</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                }
                .qr-print-item {
                    width: 58mm;
                    padding: 3mm;
                    text-align: center;
                    page-break-after: always;
                    margin: 0 auto;
                }
                .qr-print-item img {
                    width: 40mm;
                    height: 40mm;
                }
                .label {
                    font-size: 8pt;
                    font-weight: bold;
                    margin-top: 2mm;
                }
                .sublabel {
                    font-size: 6pt;
                    color: #555;
                }
                .college-name {
                    font-size: 6pt;
                    margin-bottom: 1mm;
                }
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                }
            </style>
        </head>
        <body>
            ${qrHTML}
            <script>window.onload = () => { window.print(); }<\/script>
        </body>
        </html>
    `);
}

// Export QR Codes as Images (for external printing)
function downloadQRAsImage(accNo) {
    const qrDiv = document.getElementById('qrcode-' + accNo);
    const canvas = qrDiv?.querySelector('canvas');
    if (!canvas) return;

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `QR_${accNo}.png`;
    a.click();
}
