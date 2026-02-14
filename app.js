// ===== Main Application Logic =====
// धन्वंतरी आयुर्वेद मेडिकल कॉलेज लायब्ररी

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await updateDashboard();
        updateLastBackupDisplay();

        // Check auto backup
        const autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
        const checkbox = document.getElementById('autoBackup');
        if (checkbox) checkbox.checked = autoBackupEnabled;
        if (autoBackupEnabled) checkAutoBackup();

        // Set default due date (14 days from now)
        const dueDate = document.getElementById('issueDueDate');
        if (dueDate) {
            const d = new Date();
            d.setDate(d.getDate() + 14);
            dueDate.value = d.toISOString().split('T')[0];
        }

        // Periodic localStorage backup
        setInterval(localStorageBackup, 300000);
        console.log('✅ App initialized successfully');
    } catch (err) {
        console.error('❌ App initialization error:', err);
    }
});

// ===== NAVIGATION ===== (FIXED - 'this' passed from button)

function showSection(sectionId, clickedBtn) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    if (sectionId === 'dashboard') updateDashboard();
}

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

// ===== NOTIFICATION =====

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = 'notification ' + type;
    setTimeout(() => {
        notif.className = 'notification';
    }, 4000);
}

// ===== DASHBOARD =====

async function updateDashboard() {
    try {
        const counts = await getDashboardCounts();

        document.getElementById('totalBooks').textContent = counts.totalBooks;
        document.getElementById('availableBooks').textContent = counts.availableBooks;
        document.getElementById('issuedBooks').textContent = counts.issuedBooks;
        document.getElementById('totalStudents').textContent = counts.totalStudents;
        document.getElementById('overdueBooks').textContent = counts.overdueBooks;
        document.getElementById('todayTransactions').textContent = counts.todayTransactions;

        document.getElementById('headerStats').textContent =
            'एकूण पुस्तके: ' + counts.totalBooks + ' | उपलब्ध: ' + counts.availableBooks + ' | वितरित: ' + counts.issuedBooks;

        // Recent Transactions
        const tbody = document.querySelector('#recentTransactions tbody');
        tbody.innerHTML = '';
        counts.recentTransactions.forEach(function(txn) {
            const tr = document.createElement('tr');
            const date = new Date(txn.date);
            const badgeClass = txn.type === 'issue' ? 'badge-issued' : 'badge-available';
            const badgeText = txn.type === 'issue' ? '📤 वितरित' : '📥 परत';
            tr.innerHTML = '<td>' + date.toLocaleDateString('mr-IN') + ' ' + date.toLocaleTimeString('mr-IN') + '</td>' +
                '<td>' + (txn.studentName || txn.studentId) + '</td>' +
                '<td>' + (txn.bookName || txn.bookAccNo) + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>';
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Dashboard update error:', err);
    }
}

// ===== ADD BOOK =====

document.getElementById('addBookForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const book = {
        accNo: document.getElementById('bookAccNo').value.trim(),
        name: document.getElementById('bookName').value.trim(),
        author: document.getElementById('bookAuthor').value.trim(),
        publisher: document.getElementById('bookPublisher').value.trim(),
        isbn: document.getElementById('bookISBN').value.trim(),
        year: document.getElementById('bookYear').value,
        category: document.getElementById('bookCategory').value,
        rack: document.getElementById('bookRack').value.trim(),
        price: document.getElementById('bookPrice').value,
        copies: parseInt(document.getElementById('bookCopies').value) || 1
    };

    try {
        await addBook(book);
        showNotification('✅ "' + book.name + '" पुस्तक यशस्वीरित्या नोंदणी केले!', 'success');
        e.target.reset();
        await updateDashboard();
    } catch (err) {
        if (err.name === 'ConstraintError') {
            showNotification('❌ हा Accession No. आधीच आहे!', 'error');
        } else {
            showNotification('❌ नोंदणी अयशस्वी: ' + err.message, 'error');
        }
    }
});

// ===== SEARCH BOOKS =====

async function searchBooks() {
    const query = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('searchCategory').value;
    const status = document.getElementById('searchStatus').value;

    const results = await searchBooksDB(query, category, status);
    const container = document.getElementById('searchResults');

    if (results.length === 0) {
        container.innerHTML = '<p>कोणतेही पुस्तक सापडले नाही.</p>';
        return;
    }

    var html = '<p>सापडलेली पुस्तके: <strong>' + results.length + '</strong></p>';
    html += '<table><thead><tr><th>Acc No.</th><th>पुस्तकाचे नाव</th><th>लेखक</th><th>विषय</th><th>रॅक</th><th>स्थिती</th><th>कृती</th></tr></thead><tbody>';

    results.forEach(function(book) {
        var statusBadge = book.status === 'available'
            ? '<span class="badge badge-available">✅ उपलब्ध</span>'
            : '<span class="badge badge-issued">📤 ' + (book.issuedTo || 'वितरित') + '</span>';

        html += '<tr>' +
            '<td>' + book.accNo + '</td>' +
            '<td><strong>' + book.name + '</strong></td>' +
            '<td>' + book.author + '</td>' +
            '<td>' + book.category + '</td>' +
            '<td>' + (book.rack || '-') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' +
                '<button class="btn-small" onclick="generateQRForBook(\'' + book.accNo + '\')">📱 QR</button> ' +
                '<button class="btn-danger" onclick="confirmDeleteBook(\'' + book.accNo + '\')" style="font-size:0.7em;padding:3px 8px;">🗑️</button>' +
            '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function generateQRForBook(accNo) {
    document.getElementById('qrBookId').value = accNo;
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('qrSection').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    generateSingleQR();
}

function confirmDeleteBook(accNo) {
    if (confirm('"' + accNo + '" पुस्तक कायमचे हटवायचे?')) {
        deleteBook(accNo).then(function() {
            showNotification('पुस्तक हटवले', 'success');
            searchBooks();
            updateDashboard();
        });
    }
}

// ===== ISSUE BOOK =====

document.getElementById('issueForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    var bookAccNo = document.getElementById('issueBookId').value.trim();
    var studentId = document.getElementById('issueStudentId').value.trim();
    var dueDate = document.getElementById('issueDueDate').value;

    try {
        var book = await getBook(bookAccNo);
        if (!book) {
            showNotification('❌ पुस्तक सापडले नाही', 'error');
            return;
        }
        if (book.status === 'issued') {
            showNotification('❌ हे पुस्तक आधीच वितरित आहे!', 'error');
            return;
        }

        var student = await getStudent(studentId);
        if (!student) {
            showNotification('❌ विद्यार्थी सापडला नाही. कृपया आधी नोंदणी करा.', 'error');
            return;
        }

        book.status = 'issued';
        book.issuedTo = studentId;
        book.issuedToName = student.name;
        book.issueDate = new Date().toISOString();
        book.dueDate = dueDate;
        book.issueHistory.push({
            studentId: studentId,
            studentName: student.name,
            issueDate: book.issueDate,
            dueDate: dueDate
        });
        await updateBook(book);

        if (!student.booksIssued) student.booksIssued = [];
        student.booksIssued.push(bookAccNo);
        await updateStudent(student);

        await addTransaction({
            type: 'issue',
            bookAccNo: bookAccNo,
            bookName: book.name,
            studentId: studentId,
            studentName: student.name,
            dueDate: dueDate
        });

        showNotification('✅ "' + book.name + '" → ' + student.name + ' ला वितरित केले!', 'success');
        e.target.reset();
        await updateDashboard();

        var d = new Date();
        d.setDate(d.getDate() + 14);
        document.getElementById('issueDueDate').value = d.toISOString().split('T')[0];

    } catch (err) {
        showNotification('❌ Issue अयशस्वी: ' + err.message, 'error');
    }
});

// ===== RETURN BOOK =====

document.getElementById('returnForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    var bookAccNo = document.getElementById('returnBookId').value.trim();

    try {
        var book = await getBook(bookAccNo);
        if (!book) {
            showNotification('❌ पुस्तक सापडले नाही', 'error');
            return;
        }
        if (book.status !== 'issued') {
            showNotification('❌ हे पुस्तक वितरित नाही!', 'error');
            return;
        }

        var studentId = book.issuedTo;
        var studentName = book.issuedToName;

        var overdueMsg = '';
        if (book.dueDate && new Date(book.dueDate) < new Date()) {
            var days = Math.floor((new Date() - new Date(book.dueDate)) / (1000*60*60*24));
            overdueMsg = ' (⚠️ ' + days + ' दिवस उशीर!)';
        }

        if (book.issueHistory.length > 0) {
            book.issueHistory[book.issueHistory.length - 1].returnDate = new Date().toISOString();
        }

        book.status = 'available';
        book.issuedTo = null;
        book.issuedToName = null;
        book.issueDate = null;
        book.dueDate = null;
        await updateBook(book);

        if (studentId) {
            var student = await getStudent(studentId);
            if (student) {
                student.booksIssued = (student.booksIssued || []).filter(function(id) { return id !== bookAccNo; });
                await updateStudent(student);
            }
        }

        await addTransaction({
            type: 'return',
            bookAccNo: bookAccNo,
            bookName: book.name,
            studentId: studentId,
            studentName: studentName
        });

        showNotification('✅ "' + book.name + '" परत केले!' + overdueMsg, 'success');
        e.target.reset();
        await updateDashboard();

    } catch (err) {
        showNotification('❌ Return अयशस्वी: ' + err.message, 'error');
    }
});

// ===== STUDENTS =====

document.getElementById('addStudentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    var student = {
        studentId: document.getElementById('studentId').value.trim(),
        name: document.getElementById('studentName').value.trim(),
        year: document.getElementById('studentYear').value,
        phone: document.getElementById('studentPhone').value.trim(),
        email: document.getElementById('studentEmail').value.trim()
    };

    try {
        await addStudent(student);
        showNotification('✅ "' + student.name + '" विद्यार्थी नोंदणी यशस्वी!', 'success');
        e.target.reset();
        searchStudents();
        await updateDashboard();
    } catch (err) {
        if (err.name === 'ConstraintError') {
            showNotification('❌ हा Student ID आधीच आहे!', 'error');
        } else {
            showNotification('❌ नोंदणी अयशस्वी: ' + err.message, 'error');
        }
    }
});

async function searchStudents() {
    var query = document.getElementById('studentSearch')?.value.trim().toLowerCase() || '';
    var students = await getAllStudents();
    var container = document.getElementById('studentList');

    var filtered = students;
    if (query) {
        filtered = students.filter(function(s) {
            return s.name.toLowerCase().includes(query) ||
                s.studentId.toLowerCase().includes(query) ||
                s.year.toLowerCase().includes(query);
        });
    }

    var html = '<table><thead><tr><th>ID</th><th>नाव</th><th>वर्ग</th><th>फोन</th><th>पुस्तके</th></tr></thead><tbody>';

    filtered.forEach(function(s) {
        html += '<tr><td>' + s.studentId + '</td><td>' + s.name + '</td><td>' + s.year + '</td><td>' + (s.phone || '-') + '</td><td>' + (s.booksIssued || []).length + '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== REPORTS =====

async function generateReport(type) {
    var container = document.getElementById('reportOutput');
    container.innerHTML = '<p>रिपोर्ट तयार होत आहे...</p>';

    var books = await getAllBooks();
    var transactions = await getAllTransactions();
    var html = '';

    if (type === 'daily') {
        var today = new Date().toISOString().split('T')[0];
        var todayTxns = transactions.filter(function(t) { return t.date && t.date.startsWith(today); });
        html = '<h3>📅 आजचा रिपोर्ट (' + new Date().toLocaleDateString('mr-IN') + ')</h3>';
        html += '<p>एकूण व्यवहार: ' + todayTxns.length + '</p>';
        html += '<table><thead><tr><th>वेळ</th><th>प्रकार</th><th>पुस्तक</th><th>विद्यार्थी</th></tr></thead><tbody>';
        todayTxns.forEach(function(t) {
            html += '<tr><td>' + new Date(t.date).toLocaleTimeString('mr-IN') + '</td><td>' + (t.type === 'issue' ? '📤 वितरित' : '📥 परत') + '</td><td>' + t.bookName + '</td><td>' + t.studentName + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'overdue') {
        var overdue = books.filter(function(b) {
            return b.status === 'issued' && b.dueDate && new Date(b.dueDate) < new Date();
        });
        html = '<h3>⚠️ मुदत संपलेली पुस्तके (' + overdue.length + ')</h3>';
        html += '<table><thead><tr><th>Acc No.</th><th>पुस्तक</th><th>विद्यार्थी</th><th>मुदत</th><th>उशीर (दिवस)</th></tr></thead><tbody>';
        overdue.sort(function(a,b) { return new Date(a.dueDate) - new Date(b.dueDate); }).forEach(function(b) {
            var days = Math.floor((new Date() - new Date(b.dueDate)) / (1000*60*60*24));
            html += '<tr><td>' + b.accNo + '</td><td>' + b.name + '</td><td>' + (b.issuedToName || b.issuedTo) + '</td><td>' + new Date(b.dueDate).toLocaleDateString('mr-IN') + '</td><td style="color:red;font-weight:bold;">' + days + ' दिवस</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'popular') {
        var bookCounts = {};
        transactions.filter(function(t) { return t.type === 'issue'; }).forEach(function(t) {
            if (!bookCounts[t.bookAccNo]) bookCounts[t.bookAccNo] = { name: t.bookName, count: 0 };
            bookCounts[t.bookAccNo].count++;
        });
        var sorted = Object.entries(bookCounts).sort(function(a,b) { return b[1].count - a[1].count; }).slice(0, 50);
        html = '<h3>⭐ सर्वाधिक लोकप्रिय पुस्तके</h3>';
        html += '<table><thead><tr><th>#</th><th>Acc No.</th><th>पुस्तक</th><th>वेळा वितरित</th></tr></thead><tbody>';
        sorted.forEach(function(item, i) {
            html += '<tr><td>' + (i+1) + '</td><td>' + item[0] + '</td><td>' + item[1].name + '</td><td>' + item[1].count + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'student') {
        var allStudents = await getAllStudents();
        html = '<h3>🎓 विद्यार्थी रिपोर्ट</h3>';
        html += '<table><thead><tr><th>ID</th><th>नाव</th><th>वर्ग</th><th>सध्या कडे पुस्तके</th></tr></thead><tbody>';
        allStudents.filter(function(s) { return (s.booksIssued || []).length > 0; }).forEach(function(s) {
            html += '<tr><td>' + s.studentId + '</td><td>' + s.name + '</td><td>' + s.year + '</td><td>' + s.booksIssued.length + '</td></tr>';
        });
        html += '</tbody></table>';
    }

    container.innerHTML = html;
}

// ===== EXCEL EXPORT =====

async function exportToExcel() {
    var books = await getAllBooks();
    var wsData = books.map(function(b) {
        return {
            'Accession No.': b.accNo,
            'पुस्तकाचे नाव': b.name,
            'लेखक': b.author,
            'प्रकाशक': b.publisher || '',
            'ISBN': b.isbn || '',
            'विषय': b.category,
            'रॅक': b.rack || '',
            'किंमत': b.price || '',
            'स्थिती': b.status === 'available' ? 'उपलब्ध' : 'वितरित',
            'वितरित - विद्यार्थी': b.issuedToName || '',
            'मुदत': b.dueDate || ''
        };
    });

    var ws = XLSX.utils.json_to_sheet(wsData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'पुस्तके');
    XLSX.writeFile(wb, 'DAMC_Library_Books_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showNotification('✅ Excel फाईल डाउनलोड झाली!', 'success');
}

// ===== IMPORT BOOKS FROM FILE =====

async function importBooksFromFile() {
    var fileInput = document.getElementById('importBooksFile');
    var file = fileInput.files[0];
    if (!file) {
        showNotification('कृपया फाईल निवडा', 'error');
        return;
    }

    try {
        var data = await file.arrayBuffer();
        var workbook = XLSX.read(data);
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet);

        var books = rows.map(function(row) {
            return {
                accNo: String(row['Accession No.'] || row['accNo'] || row['acc_no'] || '').trim(),
                name: String(row['Book Name'] || row['पुस्तकाचे नाव'] || row['name'] || row['title'] || '').trim(),
                author: String(row['Author'] || row['लेखक'] || row['author'] || '').trim(),
                publisher: String(row['Publisher'] || row['प्रकाशक'] || row['publisher'] || '').trim(),
                isbn: String(row['ISBN'] || row['isbn'] || '').trim(),
                year: String(row['Year'] || row['year'] || '').trim(),
                category: String(row['Category'] || row['विषय'] || row['category'] || row['subject'] || 'General').trim(),
                rack: String(row['Rack'] || row['रॅक'] || row['rack'] || '').trim(),
                price: String(row['Price'] || row['किंमत'] || row['price'] || '').trim(),
                copies: parseInt(row['Copies'] || row['copies'] || 1)
            };
        }).filter(function(b) { return b.accNo && b.name; });

        if (books.length === 0) {
            showNotification('❌ फाईलमध्ये योग्य डेटा नाही', 'error');
            return;
        }

        var result = await bulkAddBooks(books);
        showNotification('✅ ' + result.added + ' पुस्तके Import झाली! (' + result.errors + ' त्रुटी)', 'success');
        await updateDashboard();
    } catch (err) {
        showNotification('❌ Import अयशस्वी: ' + err.message, 'error');
    }
}

// ===== DOWNLOAD TEMPLATE =====

function downloadTemplate() {
    var template = [{
        'Accession No.': 'ACC-00001',
        'Book Name': 'Charaka Samhita',
        'Author': 'Agnivesha',
        'Publisher': 'Chaukhamba',
        'ISBN': '978-0000000000',
        'Year': '2020',
        'Category': 'Samhita',
        'Rack': 'R1-S1',
        'Price': '500',
        'Copies': 1
    }];
    var ws = XLSX.utils.json_to_sheet(template);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Library_Import_Template.xlsx');
    showNotification('Template डाउनलोड झाली!', 'success');
}

// ===== BOOK INFO PREVIEW =====

document.getElementById('issueBookId')?.addEventListener('blur', async function() {
    var book = await getBook(this.value.trim());
    var info = document.getElementById('issueBookInfo');
    if (book) {
        info.innerHTML = '📚 <strong>' + book.name + '</strong> | ' + book.author + ' | ' + book.category + ' | स्थिती: ' + (book.status === 'available' ? '✅ उपलब्ध' : '❌ वितरित');
    } else {
        info.innerHTML = '❌ पुस्तक सापडले नाही';
    }
});

document.getElementById('issueStudentId')?.addEventListener('blur', async function() {
    var student = await getStudent(this.value.trim());
    var info = document.getElementById('issueStudentInfo');
    if (student) {
        info.innerHTML = '🎓 <strong>' + student.name + '</strong> | ' + student.year + ' | सध्या ' + (student.booksIssued || []).length + ' पुस्तके';
    } else {
        info.innerHTML = '❌ विद्यार्थी सापडला नाही';
    }
});

document.getElementById('returnBookId')?.addEventListener('blur', async function() {
    var book = await getBook(this.value.trim());
    var info = document.getElementById('returnBookInfo');
    if (book && book.status === 'issued') {
        var isOverdue = book.dueDate && new Date(book.dueDate) < new Date();
        info.innerHTML = '📚 <strong>' + book.name + '</strong> | ' + book.author + '<br>📤 वितरित: ' + book.issuedToName + ' | मुदत: ' + new Date(book.dueDate).toLocaleDateString('mr-IN') + (isOverdue ? '<br><span style="color:red;">⚠️ मुदत संपली आहे!</span>' : '');
    } else if (book) {
        info.innerHTML = 'ℹ️ हे पुस्तक वितरित नाही, परत करण्याची गरज नाही.';
    } else {
        info.innerHTML = '❌ पुस्तक सापडले नाही';
    }
});
