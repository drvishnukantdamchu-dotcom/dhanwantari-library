// ===== QR Code Generation for Library Books =====
// थर्मल प्रिंटर सपोर्ट सह

// Generate Single QR Code
function generateSingleQR() {
    const bookId = document.getElementById('qrBookId').value.trim();
    if (!bookId) {
        showNotification('कृपया Accession No. टाका', 'error');
        return;
    }

    getBook(bookId).then(book => {
        if (!book) {
            showNotification('पुस्तक सापडले नाही', 'error');
            return;
        }

        const qrOutput = document.getElementById('qrOutput');
        qrOutput.innerHTML = '';

        const qrItem = createQRElement(book);
        qrOutput.appendChild(qrItem);
    });
}

// Generate Batch QR Codes
async function generateBatchQR() {
    const books = await getAllBooks();
    const qrOutput = document.getElementById('qrOutput');
    qrOutput.innerHTML = '<p>QR कोड तयार होत आहेत... कृपया थांबा.</p>';

    setTimeout(() => {
        qrOutput.innerHTML = '';
        // Process in batches of 50 for performance
        const batchSize = 50;
        let index = 0;

        function processBatch() {
            const batch = books.slice(index, index + batchSize);
            batch.forEach(book => {
                const qrItem = createQRElement(book);
                qrOutput.appendChild(qrItem);
            });
            index += batchSize;
            if (index < books.length) {
                setTimeout(processBatch, 100);
            } else {
                showNotification(`${books.length} QR कोड तयार झाले!`, 'success');
            }
        }
        processBatch();
    }, 100);
}

// Create QR Element
function createQRElement(book) {
    const size = parseInt(document.getElementById('qrSize')?.value || 150);
    const qrItem = document.createElement('div');
    qrItem.className = 'qr-item';
    qrItem.id = 'qr-' + book.accNo;

    const qrDiv = document.createElement('div');
    qrDiv.id = 'qrcode-' + book.accNo;

    // QR Data contains: AccNo | BookName | Author
    const qrData = JSON.stringify({
        id: book.accNo,
        name: book.name,
        author: book.author,
        lib: 'DAMC-Udgir'
    });

    qrItem.appendChild(qrDiv);

    const label = document.createElement('p');
    label.textContent = `${book.accNo} - ${book.name.substring(0, 30)}`;
    qrItem.appendChild(label);

    const authorLabel = document.createElement('small');
    authorLabel.textContent = book.author;
    authorLabel.style.color = '#777';
    qrItem.appendChild(authorLabel);

    // Print button for individual QR
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ प्रिंट';
    printBtn.className = 'btn-small';
    printBtn.onclick = () => printSingleQR(book.accNo);
    qrItem.appendChild(printBtn);

    // Generate QR after DOM append
    setTimeout(() => {
        try {
            new QRCode(qrDiv, {
                text: qrData,
                width: size,
                height: size,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch(e) {
            console.error('QR generation error for', book.accNo, e);
        }
    }, 50);

    return qrItem;
}

// QR Scanner using Camera
let scannerStream = null;
let scanTargetInput = null;

function startQRScan(targetInputId) {
    scanTargetInput = targetInputId;
    const modal = document.getElementById('qrScannerModal');
    const video = document.getElementById('qrVideo');
    modal.style.display = 'flex';

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    }).then(stream => {
        scannerStream = stream;
        video.srcObject = stream;
        video.play();
        scanQRFromVideo(video);
    }).catch(err => {
        showNotification('कॅमेरा उपलब्ध नाही. कृपया Accession No. मॅन्युअली टाका.', 'warning');
        closeQRScanner();
    });
}

function scanQRFromVideo(video) {
    // Use canvas to capture frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function scan() {
        if (!scannerStream) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        try {
            // Try using BarcodeDetector API (modern browsers)
            if ('BarcodeDetector' in window) {
                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                detector.detect(canvas).then(barcodes => {
                    if (barcodes.length > 0) {
                        const data = JSON.parse(barcodes[0].rawValue);
                        document.getElementById(scanTargetInput).value = data.id;
                        showNotification(`स्कॅन यशस्वी: ${data.id}`, 'success');
                        closeQRScanner();
                        return;
                    }
                    requestAnimationFrame(scan);
                }).catch(() => requestAnimationFrame(scan));
            } else {
                // Fallback: manual entry
                showNotification('QR Scanner या ब्राउझरमध्ये उपलब्ध नाही. कृपया मॅन्युअली टाका.', 'warning');
                closeQRScanner();
            }
        } catch(e) {
            requestAnimationFrame(scan);
        }
    }
    scan();
}

function closeQRScanner() {
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
    document.getElementById('qrScannerModal').style.display = 'none';
}
