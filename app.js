// ===== Complete Application Logic =====
// Designed & Developed by Dr. Jadhav V.R. (9518356305)

// ===== ADMIN CREDENTIALS =====
var DEFAULT_ADMIN = 'admin';
var DEFAULT_PASS = 'damc2026';

function getAdminCredentials() {
    var creds = localStorage.getItem('adminCredentials');
    if (creds) return JSON.parse(creds);
    return { username: DEFAULT_ADMIN, password: DEFAULT_PASS };
}

function saveAdminCredentials(username, password) {
    localStorage.setItem('adminCredentials', JSON.stringify({ username: username, password: password }));
}

// ===== LOGIN SYSTEM =====

var loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var username = document.getElementById('loginUsername').value.trim();
        var password = document.getElementById('loginPassword').value;
        var creds = getAdminCredentials();

        if (username === creds.username && password === creds.password) {
            sessionStorage.setItem('loggedIn', 'true');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            initApp();
        } else {
            document.getElementById('loginError').textContent = '❌ चुकीचे Username किंवा Password!';
            setTimeout(function() {
                document.getElementById('loginError').textContent = '';
            }, 3000);
        }
    });
}

function logout() {
    if (confirm('लॉगआउट करायचे?')) {
        sessionStorage.removeItem('loggedIn');
        location.reload();
    }
}

function checkLogin() {
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        return true;
    }
    return false;
}

// ===== INIT APP =====

async function initApp() {
    try {
        await initDB();
        await updateDashboard();
        updateLastBackupDisplay();
        loadSettings();
        startLiveClock();
        loadNoticesForDashboard();
        updateNotifBadge();

        var autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
        var checkbox = document.getElementById('autoBackup');
        if (checkbox) checkbox.checked = autoBackupEnabled;
        if (autoBackupEnabled) checkAutoBackup();

        var dueDate = document.getElementById('issueDueDate');
        if (dueDate) {
            var d = new Date();
            d.setDate(d.getDate() + 14);
            dueDate.value = d.toISOString().split('T')[0];
        }

        setInterval(localStorageBackup, 300000);
        setInterval(updateNotifBadge, 60000);
        console.log('App initialized successfully');
    } catch (err) {
        console.error('App init error:', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var logoUrl = localStorage.getItem('collegeLogoURL');
    if (logoUrl) {
        setLogoEverywhere(logoUrl);
    }
    if (checkLogin()) {
        initApp();
    }
});

// ===== LIVE CLOCK =====

function startLiveClock() {
    function updateClock() {
        var now = new Date();
        var options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        var dateStr = now.toLocaleDateString('mr-IN', options);
        var timeStr = now.toLocaleTimeString('mr-IN');
        var el = document.getElementById('liveDateTime');
        if (el) el.textContent = dateStr + ' | ' + timeStr;
        var dashDate = document.getElementById('dashDate');
        if (dashDate) dashDate.textContent = dateStr;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// ===== NAVIGATION =====

function showSection(sectionId, clickedBtn) {
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (clickedBtn) clickedBtn.classList.add('active');
    if (sectionId === 'dashboard') updateDashboard();
    if (sectionId === 'notifications') loadAllNotices();
    if (sectionId === 'messaging') loadInbox();
    if (sectionId === 'fileShare') loadSharedFiles();
    if (sectionId === 'database') loadDBStats();
    if (sectionId === 'settings') loadSystemInfo();
}

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    if (tabId === 'historyTab') loadTransactionHistory();
    if (tabId === 'studentListTab') searchStudents();
    if (tabId === 'inboxTab') loadInbox();
}

// ===== NOTIFICATION =====

function showNotification(message, type) {
    type = type || 'success';
    var notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = 'notification ' + type;
    setTimeout(function() { notif.className = 'notification'; }, 4000);
}

// ===== DASHBOARD =====

async function updateDashboard() {
    try {
        var counts = await getDashboardCounts();
        document.getElementById('totalBooks').textContent = counts.totalBooks;
        document.getElementById('availableBooks').textContent = counts.availableBooks;
        document.getElementById('issuedBooks').textContent = counts.issuedBooks;
        document.getElementById('totalStudents').textContent = counts.totalStudents;
        document.getElementById('overdueBooks').textContent = counts.overdueBooks;
        document.getElementById('todayTransactions').textContent = counts.todayTransactions;
        document.getElementById('totalFaculty').textContent = counts.totalFaculty;
        document.getElementById('totalMessages').textContent = counts.totalMessages;

        var tbody = document.querySelector('#recentTransactions tbody');
        tbody.innerHTML = '';
        counts.recentTransactions.forEach(function(txn) {
            var tr = document.createElement('tr');
            var date = new Date(txn.date);
            var badgeClass = txn.type === 'issue' ? 'badge-issued' : 'badge-available';
            var badgeText = txn.type === 'issue' ? '📤 वितरित' : '📥 परत';
            tr.innerHTML = '<td>' + date.toLocaleDateString('mr-IN') + ' ' + date.toLocaleTimeString('mr-IN') + '</td>' +
                '<td>' + (txn.studentName || txn.studentId) + '</td>' +
                '<td>' + (txn.bookName || txn.bookAccNo) + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>';
            tbody.appendChild(tr);
        });

        loadNoticesForDashboard();
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

async function loadNoticesForDashboard() {
    try {
        var notices = await getAllNotices();
        var recent = notices.sort(function(a, b) { return b.timestamp - a.timestamp; }).slice(0, 5);
        var container = document.getElementById('dashNotices');
        if (!container) return;
        container.innerHTML = '';
        if (recent.length === 0) {
            container.innerHTML = '<p style="color:#999;font-size:0.9em;">कोणतीही सूचना नाही</p>';
            return;
        }
        recent.forEach(function(n) {
            var typeClass = n.type === 'urgent' ? 'urgent' : (n.type === 'important' ? 'important' : '');
            container.innerHTML += '<div class="notice-item ' + typeClass + '"><h4>' + n.title + '</h4><p>' + (n.body || '').substring(0, 80) + '...</p><div class="notice-meta">' + new Date(n.date).toLocaleDateString('mr-IN') + '</div></div>';
        });
    } catch (e) { console.error(e); }
}

async function updateNotifBadge() {
    try {
        var messages = await getAllMessages();
        var unread = messages.filter(function(m) { return !m.read; }).length;
        var badge = document.getElementById('notifBadge');
        if (badge) badge.textContent = unread;
    } catch (e) {}
}

// ===== ADD BOOK =====

var addBookForm = document.getElementById('addBookForm');
if (addBookForm) {
    addBookForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var book = {
            accNo: document.getElementById('bookAccNo').value.trim(),
            name: document.getElementById('bookName').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            publisher: document.getElementById('bookPublisher').value.trim(),
            isbn: document.getElementById('bookISBN').value.trim(),
            year: document.getElementById('bookYear').value,
            category: document.getElementById('bookCategory').value,
            rack: document.getElementById('bookRack').value.trim(),
            price: document.getElementById('bookPrice').value,
            copies: parseInt(document.getElementById('bookCopies').value) || 1,
            language: document.getElementById('bookLanguage') ? document.getElementById('bookLanguage').value : '',
            edition: document.getElementById('bookEdition') ? document.getElementById('bookEdition').value : ''
        };
        try {
            await addBook(book);
            showNotification('✅ "' + book.name + '" पुस्तक नोंदणी यशस्वी!', 'success');
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
}

// ===== SEARCH BOOKS =====

async function searchBooks() {
    var query = document.getElementById('searchInput').value.trim();
    var category = document.getElementById('searchCategory').value;
    var status = document.getElementById('searchStatus').value;
    var results = await searchBooksDB(query, category, status);
    var container = document.getElementById('searchResults');

    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:30px;">कोणतेही पुस्तक सापडले नाही.</p>';
        return;
    }

    var html = '<p style="margin-bottom:10px;">सापडलेली पुस्तके: <strong>' + results.length + '</strong></p>';
    html += '<table class="data-table"><thead><tr><th>Acc No.</th><th>पुस्तकाचे नाव</th><th>लेखक</th><th>विषय</th><th>रॅक</th><th>स्थिती</th><th>कृती</th></tr></thead><tbody>';
    results.forEach(function(book) {
        var statusBadge = book.status === 'available'
            ? '<span class="badge badge-available">✅ उपलब्ध</span>'
            : '<span class="badge badge-issued">📤 ' + (book.issuedToName || 'वितरित') + '</span>';
        html += '<tr><td>' + book.accNo + '</td><td><strong>' + book.name + '</strong></td><td>' + book.author + '</td><td>' + book.category + '</td><td>' + (book.rack || '-') + '</td><td>' + statusBadge + '</td><td><button class="btn-small" onclick="generateQRForBook(\'' + book.accNo + '\')"><i class="fas fa-qrcode"></i></button> <button class="btn-danger" onclick="confirmDeleteBook(\'' + book.accNo + '\')"><i class="fas fa-trash"></i></button></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function generateQRForBook(accNo) {
    document.getElementById('qrBookId').value = accNo;
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('qrSection').classList.add('active');
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

var issueForm = document.getElementById('issueForm');
if (issueForm) {
    issueForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var bookAccNo = document.getElementById('issueBookId').value.trim();
        var studentId = document.getElementById('issueStudentId').value.trim();
        var dueDate = document.getElementById('issueDueDate').value;
        try {
            var book = await getBook(bookAccNo);
            if (!book) { showNotification('❌ पुस्तक सापडले नाही', 'error'); return; }
            if (book.status === 'issued') { showNotification('❌ हे पुस्तक आधीच वितरित आहे!', 'error'); return; }
            var student = await getStudent(studentId);
            if (!student) { showNotification('❌ विद्यार्थी सापडला नाही', 'error'); return; }

            book.status = 'issued';
            book.issuedTo = studentId;
            book.issuedToName = student.name;
            book.issueDate = new Date().toISOString();
            book.dueDate = dueDate;
            book.issueCount = (book.issueCount || 0) + 1;
            book.issueHistory.push({ studentId: studentId, studentName: student.name, issueDate: book.issueDate, dueDate: dueDate });
            await updateBook(book);

            if (!student.booksIssued) student.booksIssued = [];
            student.booksIssued.push(bookAccNo);
            student.totalBooksIssued = (student.totalBooksIssued || 0) + 1;
            await updateStudent(student);

            await addTransaction({ type: 'issue', bookAccNo: bookAccNo, bookName: book.name, studentId: studentId, studentName: student.name, dueDate: dueDate });

            showNotification('✅ "' + book.name + '" → ' + student.name + ' ला वितरित केले!', 'success');
            e.target.reset();
            var d = new Date(); d.setDate(d.getDate() + 14);
            document.getElementById('issueDueDate').value = d.toISOString().split('T')[0];
            await updateDashboard();
        } catch (err) {
            showNotification('❌ Issue अयशस्वी: ' + err.message, 'error');
        }
    });
}

// ===== RETURN BOOK =====

var returnForm = document.getElementById('returnForm');
if (returnForm) {
    returnForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var bookAccNo = document.getElementById('returnBookId').value.trim();
        try {
            var book = await getBook(bookAccNo);
            if (!book) { showNotification('❌ पुस्तक सापडले नाही', 'error'); return; }
            if (book.status !== 'issued') { showNotification('❌ हे पुस्तक वितरित नाही!', 'error'); return; }

            var studentId = book.issuedTo;
            var studentName = book.issuedToName;
            var overdueMsg = '';
            if (book.dueDate && new Date(book.dueDate) < new Date()) {
                var days = Math.floor((new Date() - new Date(book.dueDate)) / 86400000);
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
            await addTransaction({ type: 'return', bookAccNo: bookAccNo, bookName: book.name, studentId: studentId, studentName: studentName });
            showNotification('✅ "' + book.name + '" परत केले!' + overdueMsg, 'success');
            e.target.reset();
            await updateDashboard();
        } catch (err) {
            showNotification('❌ Return अयशस्वी: ' + err.message, 'error');
        }
    });
}

// ===== TRANSACTION HISTORY =====

async function loadTransactionHistory() {
    var transactions = await getAllTransactions();
    var sorted = transactions.sort(function(a, b) { return b.timestamp - a.timestamp; }).slice(0, 100);
    var container = document.getElementById('transactionHistory');
    var html = '<table class="data-table"><thead><tr><th>तारीख/वेळ</th><th>प्रकार</th><th>पुस्तक</th><th>विद्यार्थी</th></tr></thead><tbody>';
    sorted.forEach(function(t) {
        var date = new Date(t.date);
        html += '<tr><td>' + date.toLocaleDateString('mr-IN') + ' ' + date.toLocaleTimeString('mr-IN') + '</td><td><span class="badge ' + (t.type === 'issue' ? 'badge-issued' : 'badge-available') + '">' + (t.type === 'issue' ? '📤 वितरित' : '📥 परत') + '</span></td><td>' + (t.bookName || t.bookAccNo) + '</td><td>' + (t.studentName || t.studentId) + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===== STUDENTS =====

var addStudentForm = document.getElementById('addStudentForm');
if (addStudentForm) {
    addStudentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var student = {
            studentId: document.getElementById('studentId').value.trim(),
            name: document.getElementById('studentName').value.trim(),
            year: document.getElementById('studentYear').value,
            phone: document.getElementById('studentPhone').value.trim(),
            email: document.getElementById('studentEmail').value.trim(),
            gender: document.getElementById('studentGender') ? document.getElementById('studentGender').value : ''
        };
        try {
            await addStudent(student);
            showNotification('✅ "' + student.name + '" नोंदणी यशस्वी!', 'success');
            e.target.reset();
            await updateDashboard();
        } catch (err) {
            if (err.name === 'ConstraintError') showNotification('❌ हा ID आधीच आहे!', 'error');
            else showNotification('❌ नोंदणी अयशस्वी: ' + err.message, 'error');
        }
    });
}

async function searchStudents() {
    var searchEl = document.getElementById('studentSearch');
    var query = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var yearFilter = document.getElementById('studentYearFilter');
    var yearVal = yearFilter ? yearFilter.value : '';
    var students = await getAllStudents();
    var filtered = students;
    if (query) {
        filtered = filtered.filter(function(s) {
            return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query);
        });
    }
    if (yearVal) {
        filtered = filtered.filter(function(s) { return s.year === yearVal; });
    }
    var container = document.getElementById('studentList');
    var html = '<p>एकूण: <strong>' + filtered.length + '</strong></p>';
    html += '<table class="data-table"><thead><tr><th>ID</th><th>नाव</th><th>वर्ग</th><th>फोन</th><th>पुस्तके</th><th>कृती</th></tr></thead><tbody>';
    filtered.forEach(function(s) {
        html += '<tr><td>' + s.studentId + '</td><td>' + s.name + '</td><td>' + s.year + '</td><td>' + (s.phone || '-') + '</td><td>' + (s.booksIssued || []).length + '</td><td><button class="btn-danger" onclick="confirmDeleteStudent(\'' + s.studentId + '\')"><i class="fas fa-trash"></i></button></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function confirmDeleteStudent(id) {
    if (confirm('विद्यार्थी "' + id + '" हटवायचा?')) {
        deleteStudent(id).then(function() {
            showNotification('विद्यार्थी हटवला', 'success');
            searchStudents();
            updateDashboard();
        });
    }
}

// ===== BULK STUDENT UPLOAD =====

async function importStudentsFromFile() {
    var fileInput = document.getElementById('importStudentsFile');
    var file = fileInput.files[0];
    if (!file) { showNotification('कृपया फाईल निवडा', 'error'); return; }
    try {
        var data = await file.arrayBuffer();
        var workbook = XLSX.read(data);
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet);
        var students = rows.map(function(row) {
            return {
                studentId: String(row['Roll No'] || row['ID'] || row['studentId'] || '').trim(),
                name: String(row['Name'] || row['name'] || row['नाव'] || '').trim(),
                year: String(row['Year'] || row['Class'] || row['year'] || row['वर्ग'] || '').trim(),
                phone: String(row['Phone'] || row['Mobile'] || row['phone'] || '').trim(),
                email: String(row['Email'] || row['email'] || '').trim(),
                gender: String(row['Gender'] || row['gender'] || '').trim()
            };
        }).filter(function(s) { return s.studentId && s.name; });
        if (students.length === 0) { showNotification('❌ फाईलमध्ये डेटा नाही', 'error'); return; }
        var result = await bulkAddStudents(students);
        showNotification('✅ ' + result.added + ' विद्यार्थी Import झाले!', 'success');
        await updateDashboard();
    } catch (err) {
        showNotification('❌ Import अयशस्वी: ' + err.message, 'error');
    }
}

function downloadStudentTemplate() {
    var template = [{ 'Roll No': 'BAMS-001', 'Name': 'Example Student', 'Year': '1st BAMS', 'Phone': '9876543210', 'Email': 'student@email.com', 'Gender': 'Male' }];
    var ws = XLSX.utils.json_to_sheet(template);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'Student_Import_Template.xlsx');
    showNotification('Template डाउनलोड झाली!', 'success');
}

// ===== MESSAGING SYSTEM =====

var sendMsgForm = document.getElementById('sendMsgForm');
if (sendMsgForm) {
    sendMsgForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var msg = {
            recipientType: document.getElementById('msgRecipientType').value,
            to: document.getElementById('msgRecipient').value,
            subject: document.getElementById('msgSubject').value.trim(),
            body: document.getElementById('msgBody').value.trim(),
            priority: document.getElementById('msgPriority').value,
            from: 'Admin'
        };
        try {
            await addMessage(msg);
            showNotification('✅ संदेश पाठवला!', 'success');
            e.target.reset();
            updateNotifBadge();
        } catch (err) {
            showNotification('❌ संदेश पाठवता आला नाही', 'error');
        }
    });
}

async function updateRecipientList() {
    var type = document.getElementById('msgRecipientType').value;
    var select = document.getElementById('msgRecipient');
    select.innerHTML = '';
    if (type === 'all') {
        select.innerHTML = '<option value="all">सर्वांना</option>';
    } else if (type === 'year') {
        ['1st BAMS', '2nd BAMS', '3rd BAMS', 'Final BAMS'].forEach(function(y) {
            select.innerHTML += '<option value="' + y + '">' + y + '</option>';
        });
    } else {
        var students = await getAllStudents();
        var filtered = students;
        if (type === 'faculty') filtered = students.filter(function(s) { return s.year === 'Faculty' || s.year === 'Staff'; });
        else filtered = students.filter(function(s) { return s.year !== 'Faculty' && s.year !== 'Staff'; });
        select.innerHTML = '<option value="all">सर्व</option>';
        filtered.forEach(function(s) {
            select.innerHTML += '<option value="' + s.studentId + '">' + s.name + ' (' + s.studentId + ')</option>';
        });
    }
}

async function loadInbox() {
    var messages = await getAllMessages();
    var sorted = messages.sort(function(a, b) { return b.timestamp - a.timestamp; });
    var container = document.getElementById('messageInbox');
    if (!container) return;
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:30px;">कोणताही संदेश नाही</p>';
        return;
    }
    var html = '';
    sorted.forEach(function(m) {
        var readClass = m.read ? '' : ' unread';
        html += '<div class="msg-item' + readClass + '" onclick="markMessageRead(' + m.msgId + ')">' +
            '<h4>' + (m.priority === 'urgent' ? '🔴 ' : m.priority === 'important' ? '🟡 ' : '') + m.subject + '</h4>' +
            '<p>' + m.body.substring(0, 100) + '...</p>' +
            '<div class="msg-meta">To: ' + m.to + ' | ' + new Date(m.date).toLocaleDateString('mr-IN') + ' ' + new Date(m.date).toLocaleTimeString('mr-IN') + '</div>' +
            (m.reply ? '<div class="msg-reply"><strong>Reply:</strong> ' + m.reply + '</div>' : '') +
            '<div style="margin-top:8px;"><input type="text" id="reply-' + m.msgId + '" placeholder="Reply टाका..." style="padding:5px 10px;border:1px solid #ddd;border-radius:5px;width:70%;font-size:0.85em;"> <button onclick="replyToMessage(' + m.msgId + ')" class="btn-small">Reply</button> <button onclick="deleteMessage(' + m.msgId + ')" class="btn-danger" style="font-size:0.7em;">🗑️</button></div></div>';
    });
    container.innerHTML = html;
}

async function markMessageRead(msgId) {
    var messages = await getAllMessages();
    var msg = messages.find(function(m) { return m.msgId === msgId; });
    if (msg && !msg.read) {
        msg.read = true;
        await updateMessage(msg);
        updateNotifBadge();
    }
}

async function replyToMessage(msgId) {
    var replyInput = document.getElementById('reply-' + msgId);
    if (!replyInput || !replyInput.value.trim()) return;
    var messages = await getAllMessages();
    var msg = messages.find(function(m) { return m.msgId === msgId; });
    if (msg) {
        msg.reply = replyInput.value.trim();
        msg.replyDate = new Date().toISOString();
        msg.read = true;
        await updateMessage(msg);
        showNotification('Reply पाठवला!', 'success');
        loadInbox();
    }
}

async function deleteMessage(msgId) {
    if (confirm('संदेश हटवायचा?')) {
        await dbDelete('messages', msgId);
        showNotification('संदेश हटवला', 'success');
        loadInbox();
        updateNotifBadge();
    }
}

async function sendBulkMessage() {
    var target = document.getElementById('bulkMsgTarget').value;
    var subject = document.getElementById('bulkMsgSubject').value.trim();
    var body = document.getElementById('bulkMsgBody').value.trim();
    if (!subject || !body) { showNotification('कृपया विषय आणि संदेश लिहा', 'error'); return; }

    var students = await getAllStudents();
    var targets = [];
    if (target === 'all_students') targets = students.filter(function(s) { return s.year !== 'Faculty' && s.year !== 'Staff'; });
    else if (target === 'all_faculty') targets = students.filter(function(s) { return s.year === 'Faculty' || s.year === 'Staff'; });
    else if (target === 'overdue') {
        var books = await getAllBooks();
        var overdueStudentIds = books.filter(function(b) { return b.status === 'issued' && b.dueDate && new Date(b.dueDate) < new Date(); }).map(function(b) { return b.issuedTo; });
        targets = students.filter(function(s) { return overdueStudentIds.includes(s.studentId); });
    }
    else targets = students.filter(function(s) { return s.year === target; });

    var count = 0;
    for (var i = 0; i < targets.length; i++) {
        await addMessage({ recipientType: 'individual', to: targets[i].studentId, toName: targets[i].name, subject: subject, body: body, priority: 'normal', from: 'Admin (Bulk)' });
        count++;
    }
    showNotification('✅ ' + count + ' संदेश पाठवले!', 'success');
    document.getElementById('bulkMsgResult').innerHTML = '<p style="color:green;font-weight:bold;">✅ ' + count + ' लोकांना संदेश पाठवला गेला.</p>';
}

// ===== NOTICES =====

var addNoticeForm = document.getElementById('addNoticeForm');
if (addNoticeForm) {
    addNoticeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var notice = {
            title: document.getElementById('noticeTitle').value.trim(),
            type: document.getElementById('noticeType').value,
            body: document.getElementById('noticeBody').value.trim(),
            target: document.getElementById('noticeFor').value
        };
        try {
            await addNotice(notice);
            showNotification('✅ सूचना प्रकाशित केली!', 'success');
            e.target.reset();
            loadAllNotices();
            loadNoticesForDashboard();
        } catch (err) {
            showNotification('❌ सूचना प्रकाशित करता आली नाही', 'error');
        }
    });
}

async function loadAllNotices() {
    var notices = await getAllNotices();
    var sorted = notices.sort(function(a, b) { return b.timestamp - a.timestamp; });
    var container = document.getElementById('noticeBoard');
    if (!container) return;
    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">कोणतीही सूचना नाही</p>';
        return;
    }
    var html = '';
    sorted.forEach(function(n) {
        var typeClass = n.type === 'urgent' ? 'urgent' : (n.type === 'important' ? 'important' : '');
        var typeIcon = n.type === 'urgent' ? '🔴' : n.type === 'important' ? '🟡' : n.type === 'event' ? '📅' : n.type === 'exam' ? '📝' : n.type === 'holiday' ? '🎉' : '📢';
        html += '<div class="notice-item ' + typeClass + '"><h4>' + typeIcon + ' ' + n.title + '</h4><p>' + n.body + '</p><div class="notice-meta">📅 ' + new Date(n.date).toLocaleDateString('mr-IN') + ' | 👥 ' + n.target + ' <button onclick="confirmDeleteNotice(' + n.noticeId + ')" class="btn-danger" style="font-size:0.7em;margin-left:10px;">🗑️ हटवा</button></div></div>';
    });
    container.innerHTML = html;
}

function confirmDeleteNotice(id) {
    if (confirm('सूचना हटवायची?')) {
        deleteNotice(id).then(function() {
            showNotification('सूचना हटवली', 'success');
            loadAllNotices();
            loadNoticesForDashboard();
        });
    }
}

// ===== FILE SHARING =====

var fileShareForm = document.getElementById('fileShareForm');
if (fileShareForm) {
    fileShareForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var fileInput = document.getElementById('shareFile');
        var files = fileInput.files;
        if (files.length === 0) { showNotification('कृपया फाईल निवडा', 'error'); return; }

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var reader = new FileReader();
            reader.onload = async function(event) {
                var fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: event.target.result,
                    target: document.getElementById('shareTarget').value,
                    description: document.getElementById('shareDescription').value.trim(),
                    uploadedBy: 'Admin'
                };
                await addSharedFile(fileData);
            };
            reader.readAsDataURL(file);
        }
        showNotification('✅ ' + files.length + ' फाईल शेअर केली!', 'success');
        e.target.reset();
        setTimeout(loadSharedFiles, 500);
    });
}

async function loadSharedFiles() {
    var files = await getAllSharedFiles();
    var container = document.getElementById('sharedFilesList');
    if (!container) return;
    if (files.length === 0) {
        container.innerHTML = '<p style="color:#999;">कोणतीही फाईल शेअर केलेली नाही</p>';
        return;
    }
    var html = '';
    files.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(f) {
        var sizeKB = Math.round(f.size / 1024);
        var icon = f.type && f.type.includes('pdf') ? 'fa-file-pdf' : f.type && f.type.includes('image') ? 'fa-file-image' : f.type && f.type.includes('word') ? 'fa-file-word' : 'fa-file';
        html += '<div class="file-item"><div class="file-item-info"><i class="fas ' + icon + '"></i><div><strong>' + f.name + '</strong><br><small>' + sizeKB + ' KB | ' + f.target + ' | ' + new Date(f.date).toLocaleDateString('mr-IN') + '</small><br><small>' + (f.description || '') + '</small></div></div><div><a href="' + f.data + '" download="' + f.name + '" class="btn-small"><i class="fas fa-download"></i></a> <button onclick="confirmDeleteFile(' + f.fileId + ')" class="btn-danger" style="font-size:0.7em;"><i class="fas fa-trash"></i></button></div></div>';
    });
    container.innerHTML = html;
}

function confirmDeleteFile(id) {
    if (confirm('फाईल हटवायची?')) {
        deleteSharedFile(id).then(function() {
            showNotification('फाईल हटवली', 'success');
            loadSharedFiles();
        });
    }
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
        html = '<h3><i class="fas fa-calendar-day"></i> आजचा रिपोर्ट (' + new Date().toLocaleDateString('mr-IN') + ')</h3><p>एकूण व्यवहार: <strong>' + todayTxns.length + '</strong></p>';
        html += '<table class="data-table"><thead><tr><th>वेळ</th><th>प्रकार</th><th>पुस्तक</th><th>विद्यार्थी</th></tr></thead><tbody>';
        todayTxns.forEach(function(t) {
            html += '<tr><td>' + new Date(t.date).toLocaleTimeString('mr-IN') + '</td><td>' + (t.type === 'issue' ? '📤 वितरित' : '📥 परत') + '</td><td>' + t.bookName + '</td><td>' + t.studentName + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'overdue') {
        var overdue = books.filter(function(b) { return b.status === 'issued' && b.dueDate && new Date(b.dueDate) < new Date(); });
        html = '<h3><i class="fas fa-exclamation-triangle"></i> मुदत संपलेली पुस्तके (' + overdue.length + ')</h3>';
        html += '<table class="data-table"><thead><tr><th>Acc No.</th><th>पुस्तक</th><th>विद्यार्थी</th><th>मुदत</th><th>उशीर</th></tr></thead><tbody>';
        overdue.sort(function(a, b) { return new Date(a.dueDate) - new Date(b.dueDate); }).forEach(function(b) {
            var days = Math.floor((new Date() - new Date(b.dueDate)) / 86400000);
            html += '<tr><td>' + b.accNo + '</td><td>' + b.name + '</td><td>' + (b.issuedToName || b.issuedTo) + '</td><td>' + new Date(b.dueDate).toLocaleDateString('mr-IN') + '</td><td style="color:red;font-weight:bold;">' + days + ' दिवस</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'popular') {
        var bookCounts = {};
        transactions.filter(function(t) { return t.type === 'issue'; }).forEach(function(t) {
            if (!bookCounts[t.bookAccNo]) bookCounts[t.bookAccNo] = { name: t.bookName, count: 0 };
            bookCounts[t.bookAccNo].count++;
        });
        var sorted = Object.entries(bookCounts).sort(function(a, b) { return b[1].count - a[1].count; }).slice(0, 50);
        html = '<h3><i class="fas fa-star"></i> लोकप्रिय पुस्तके</h3><table class="data-table"><thead><tr><th>#</th><th>Acc No.</th><th>पुस्तक</th><th>वेळा</th></tr></thead><tbody>';
        sorted.forEach(function(item, i) {
            html += '<tr><td>' + (i + 1) + '</td><td>' + item[0] + '</td><td>' + item[1].name + '</td><td>' + item[1].count + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'student') {
        var students = await getAllStudents();
        html = '<h3><i class="fas fa-user-graduate"></i> विद्यार्थी रिपोर्ट</h3><table class="data-table"><thead><tr><th>ID</th><th>नाव</th><th>वर्ग</th><th>सध्या पुस्तके</th><th>एकूण</th></tr></thead><tbody>';
        students.forEach(function(s) {
            html += '<tr><td>' + s.studentId + '</td><td>' + s.name + '</td><td>' + s.year + '</td><td>' + (s.booksIssued || []).length + '</td><td>' + (s.totalBooksIssued || 0) + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'category') {
        var cats = {};
        books.forEach(function(b) {
            if (!cats[b.category]) cats[b.category] = { total: 0, available: 0, issued: 0 };
            cats[b.category].total++;
            if (b.status === 'available') cats[b.category].available++;
            else cats[b.category].issued++;
        });
        html = '<h3><i class="fas fa-tags"></i> विषयवार रिपोर्ट</h3><table class="data-table"><thead><tr><th>विषय</th><th>एकूण</th><th>उपलब्ध</th><th>वितरित</th></tr></thead><tbody>';
        Object.keys(cats).sort().forEach(function(cat) {
            html += '<tr><td>' + cat + '</td><td>' + cats[cat].total + '</td><td style="color:green;">' + cats[cat].available + '</td><td style="color:red;">' + cats[cat].issued + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (type === 'monthly') {
        var months = {};
        transactions.forEach(function(t) {
            var m = t.date ? t.date.substring(0, 7) : 'unknown';
            if (!months[m]) months[m] = { issue: 0, return: 0 };
            if (t.type === 'issue') months[m].issue++;
            else months[m].return++;
        });
        html = '<h3><i class="fas fa-calendar-alt"></i> मासिक रिपोर्ट</h3><table class="data-table"><thead><tr><th>महिना</th><th>वितरित</th><th>परत</th><th>एकूण</th></tr></thead><tbody>';
        Object.keys(months).sort().reverse().forEach(function(m) {
            html += '<tr><td>' + m + '</td><td>' + months[m].issue + '</td><td>' + months[m].return + '</td><td>' + (months[m].issue + months[m].return) + '</td></tr>';
        });
        html += '</tbody></table>';
    }
    container.innerHTML = html;
}

// ===== EXCEL EXPORT/IMPORT =====

async function exportToExcel() {
    var books = await getAllBooks();
    var wsData = books.map(function(b) {
        return { 'Accession No.': b.accNo, 'Book Name': b.name, 'Author': b.author, 'Publisher': b.publisher || '', 'ISBN': b.isbn || '', 'Category': b.category, 'Rack': b.rack || '', 'Price': b.price || '', 'Status': b.status, 'Issued To': b.issuedToName || '', 'Due Date': b.dueDate || '' };
    });
    var ws = XLSX.utils.json_to_sheet(wsData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Books');
    XLSX.writeFile(wb, 'DAMC_Library_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showNotification('✅ Excel Export झाली!', 'success');
}

async function exportFullExcel() {
    var books = await getAllBooks();
    var students = await getAllStudents();
    var transactions = await getAllTransactions();
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(books), 'Books');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), 'Students');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions), 'Transactions');
    XLSX.writeFile(wb, 'DAMC_Full_Export_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showNotification('✅ Full Excel Export झाली!', 'success');
}

async function importBooksFromFile() {
    var fileInput = document.getElementById('importBooksFile');
    var file = fileInput.files[0];
    if (!file) { showNotification('कृपया फाईल निवडा', 'error'); return; }
    try {
        var data = await file.arrayBuffer();
        var workbook = XLSX.read(data);
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet);
        var books = rows.map(function(row) {
            return {
                accNo: String(row['Accession No.'] || row['accNo'] || row['acc_no'] || row['Acc No'] || '').trim(),
                name: String(row['Book Name'] || row['name'] || row['title'] || row['Title'] || '').trim(),
                author: String(row['Author'] || row['author'] || '').trim(),
                publisher: String(row['Publisher'] || row['publisher'] || '').trim(),
                isbn: String(row['ISBN'] || row['isbn'] || '').trim(),
                year: String(row['Year'] || row['year'] || '').trim(),
                category: String(row['Category'] || row['category'] || row['Subject'] || 'General').trim(),
                rack: String(row['Rack'] || row['rack'] || '').trim(),
                price: String(row['Price'] || row['price'] || '').trim(),
                language: String(row['Language'] || row['language'] || '').trim(),
                edition: String(row['Edition'] || row['edition'] || '').trim()
            };
        }).filter(function(b) { return b.accNo && b.name; });
        if (books.length === 0) { showNotification('❌ डेटा नाही', 'error'); return; }
        var result = await bulkAddBooks(books);
        showNotification('✅ ' + result.added + ' पुस्तके Import झाली!', 'success');
        await updateDashboard();
    } catch (err) {
        showNotification('❌ Import अयशस्वी: ' + err.message, 'error');
    }
}

function downloadTemplate() {
    var template = [{ 'Accession No.': 'ACC-00001', 'Book Name': 'Charaka Samhita', 'Author': 'Agnivesha', 'Publisher': 'Chaukhamba', 'ISBN': '', 'Year': '2020', 'Category': 'Samhita', 'Rack': 'R1-S1', 'Price': '500', 'Language': 'Sanskrit', 'Edition': '1st' }];
    var ws = XLSX.utils.json_to_sheet(template);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Library_Book_Template.xlsx');
    showNotification('Template डाउनलोड झाली!', 'success');
}

// ===== DATABASE MANAGEMENT =====

async function loadDBStats() {
    var books = await getAllBooks();
    var students = await getAllStudents();
    var transactions = await getAllTransactions();
    var messages = await getAllMessages();
    var notices = await getAllNotices();
    var files = await getAllSharedFiles();
    var container = document.getElementById('dbStats');
    container.innerHTML = '<div class="dash-card card-blue" style="display:inline-block;margin:5px;padding:15px;"><strong>' + books.length + '</strong><br>पुस्तके</div>' +
        '<div class="dash-card card-green" style="display:inline-block;margin:5px;padding:15px;"><strong>' + students.length + '</strong><br>विद्यार्थी</div>' +
        '<div class="dash-card card-orange" style="display:inline-block;margin:5px;padding:15px;"><strong>' + transactions.length + '</strong><br>व्यवहार</div>' +
        '<div class="dash-card card-purple" style="display:inline-block;margin:5px;padding:15px;"><strong>' + messages.length + '</strong><br>संदेश</div>' +
        '<div class="dash-card card-teal" style="display:inline-block;margin:5px;padding:15px;"><strong>' + notices.length + '</strong><br>सूचना</div>' +
        '<div class="dash-card card-pink" style="display:inline-block;margin:5px;padding:15px;"><strong>' + files.length + '</strong><br>फाईल्स</div>';
}

async function showAllBooks() {
    var books = await getAllBooks();
    var container = document.getElementById('dbOutput');
    var html = '<h3>सर्व पुस्तके (' + books.length + ')</h3><table class="data-table"><thead><tr><th>Acc No</th><th>नाव</th><th>लेखक</th><th>विषय</th><th>स्थिती</th></tr></thead><tbody>';
    books.forEach(function(b) {
        html += '<tr><td>' + b.accNo + '</td><td>' + b.name + '</td><td>' + b.author + '</td><td>' + b.category + '</td><td>' + b.status + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function showAllStudentsDB() {
    var students = await getAllStudents();
    var container = document.getElementById('dbOutput');
    var html = '<h3>सर्व विद्यार्थी (' + students.length + ')</h3><table class="data-table"><thead><tr><th>ID</th><th>नाव</th><th>वर्ग</th><th>फोन</th></tr></thead><tbody>';
    students.forEach(function(s) {
        html += '<tr><td>' + s.studentId + '</td><td>' + s.name + '</td><td>' + s.year + '</td><td>' + (s.phone || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function showAllTransactionsDB() {
    var txns = await getAllTransactions();
    var container = document.getElementById('dbOutput');
    var html = '<h3>सर्व व्यवहार (' + txns.length + ')</h3><table class="data-table"><thead><tr><th>तारीख</th><th>प्रकार</th><th>पुस्तक</th><th>विद्यार्थी</th></tr></thead><tbody>';
    txns.sort(function(a, b) { return b.timestamp - a.timestamp; }).slice(0, 200).forEach(function(t) {
        html += '<tr><td>' + new Date(t.date).toLocaleDateString('mr-IN') + '</td><td>' + t.type + '</td><td>' + (t.bookName || '') + '</td><td>' + (t.studentName || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function showAllMessages() {
    var msgs = await getAllMessages();
    var container = document.getElementById('dbOutput');
    var html = '<h3>सर्व संदेश (' + msgs.length + ')</h3>';
    msgs.sort(function(a, b) { return b.timestamp - a.timestamp; }).forEach(function(m) {
        html += '<div class="msg-item"><strong>' + m.subject + '</strong> → ' + m.to + '<br><small>' + new Date(m.date).toLocaleDateString('mr-IN') + '</small></div>';
    });
    container.innerHTML = html;
}

function clearOldTransactions() {
    if (!confirm('60 दिवसांपूर्वीचे सर्व व्यवहार हटवायचे?')) return;
    getAllTransactions().then(function(txns) {
        var cutoff = Date.now() - (60 * 86400000);
        var toDelete = txns.filter(function(t) { return t.timestamp < cutoff; });
        var txn = db.transaction('transactions', 'readwrite');
        var store = txn.objectStore('transactions');
        toDelete.forEach(function(t) { store.delete(t.txnId); });
        txn.oncomplete = function() {
            showNotification(toDelete.length + ' जुने व्यवहार हटवले', 'success');
        };
    });
}

// ===== SETTINGS =====

function loadSettings() {
    var collegeName = localStorage.getItem('collegeName');
    var ticker = localStorage.getItem('tickerText');
    var libTime = localStorage.getItem('libraryTime');
    if (collegeName) {
        var el = document.getElementById('settCollegeName');
        if (el) el.value = collegeName;
    }
    if (ticker) {
        var tickerEl = document.getElementById('settTicker');
        if (tickerEl) tickerEl.value = ticker;
        var tickerContent = document.getElementById('tickerContent');
        if (tickerContent) tickerContent.textContent = ticker;
    }
    if (libTime) {
        var ltEl = document.getElementById('settLibraryTime');
        if (ltEl) ltEl.value = libTime;
    }
}

function saveSettings() {
    var collegeName = document.getElementById('settCollegeName').value;
    var ticker = document.getElementById('settTicker').value;
    var libTime = document.getElementById('settLibraryTime').value;
    var logoURL = document.getElementById('settLogoURL').value.trim();

    localStorage.setItem('collegeName', collegeName);
    localStorage.setItem('tickerText', ticker);
    localStorage.setItem('libraryTime', libTime);

    var tickerContent = document.getElementById('tickerContent');
    if (tickerContent) tickerContent.textContent = ticker;

    if (logoURL) {
        localStorage.setItem('collegeLogoURL', logoURL);
        setLogoEverywhere(logoURL);
    }

    showNotification('✅ सेटिंग्ज सेव्ह झाल्या!', 'success');
}

function previewLogo(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            localStorage.setItem('collegeLogoURL', e.target.result);
            setLogoEverywhere(e.target.result);
            var preview = document.getElementById('logoPreview');
            if (preview) preview.innerHTML = '<img src="' + e.target.result + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function setLogoEverywhere(url) {
    var topbarLogo = document.getElementById('collegeLogo');
    if (topbarLogo) topbarLogo.innerHTML = '<img src="' + url + '">';
    var loginLogo = document.getElementById('loginLogoPreview');
    if (loginLogo) loginLogo.innerHTML = '<img src="' + url + '">';
}

function changePassword() {
    var oldPass = document.getElementById('settOldPass').value;
    var newPass = document.getElementById('settNewPass').value;
    var confirmPass = document.getElementById('settConfirmPass').value;
    var creds = getAdminCredentials();

    if (oldPass !== creds.password) { showNotification('❌ जुना Password चुकीचा!', 'error'); return; }
    if (newPass.length < 4) { showNotification('❌ Password किमान 4 अक्षरे असावा!', 'error'); return; }
    if (newPass !== confirmPass) { showNotification('❌ नवीन Password जुळत नाही!', 'error'); return; }

    saveAdminCredentials(creds.username, newPass);
    showNotification('✅ Password बदलला!', 'success');
    document.getElementById('settOldPass').value = '';
    document.getElementById('settNewPass').value = '';
    document.getElementById('settConfirmPass').value = '';
}

function setTheme(theme) {
    localStorage.setItem('theme', theme);
    showNotification('Theme बदलला: ' + theme, 'success');
}

function loadSystemInfo() {
    var container = document.getElementById('systemInfo');
    if (!container) return;
    container.innerHTML = '<p><strong>System:</strong> DAMC Library Management v2.0</p>' +
        '<p><strong>Database:</strong> IndexedDB (Browser)</p>' +
        '<p><strong>Hosting:</strong> GitHub Pages</p>' +
        '<p><strong>Browser:</strong> ' + navigator.userAgent.substring(0, 50) + '...</p>';
}

// ===== BOOK INFO PREVIEW =====

var issueBookIdEl = document.getElementById('issueBookId');
if (issueBookIdEl) {
    issueBookIdEl.addEventListener('blur', async function() {
        var book = await getBook(this.value.trim());
        var info = document.getElementById('issueBookInfo');
        if (book) {
            info.innerHTML = '<i class="fas fa-book"></i> <strong>' + book.name + '</strong> | ' + book.author + ' | ' + book.category + ' | ' + (book.status === 'available' ? '<span style="color:green;">✅ उपलब्ध</span>' : '<span style="color:red;">❌ वितरित</span>');
        } else { info.innerHTML = '<span style="color:red;">❌ पुस्तक सापडले नाही</span>'; }
    });
}

var issueStudentIdEl = document.getElementById('issueStudentId');
if (issueStudentIdEl) {
    issueStudentIdEl.addEventListener('blur', async function() {
        var student = await getStudent(this.value.trim());
        var info = document.getElementById('issueStudentInfo');
        if (student) {
            info.innerHTML = '<i class="fas fa-user-graduate"></i> <strong>' + student.name + '</strong> | ' + student.year + ' | सध्या ' + (student.booksIssued || []).length + ' पुस्तके';
        } else { info.innerHTML = '<span style="color:red;">❌ विद्यार्थी सापडला नाही</span>'; }
    });
}

var returnBookIdEl = document.getElementById('returnBookId');
if (returnBookIdEl) {
    returnBookIdEl.addEventListener('blur', async function() {
        var book = await getBook(this.value.trim());
        var info = document.getElementById('returnBookInfo');
        if (book && book.status === 'issued') {
            var isOverdue = book.dueDate && new Date(book.dueDate) < new Date();
            info.innerHTML = '<i class="fas fa-book"></i> <strong>' + book.name + '</strong> | ' + book.author + '<br><i class="fas fa-user"></i> वितरित: ' + book.issuedToName + ' | मुदत: ' + new Date(book.dueDate).toLocaleDateString('mr-IN') + (isOverdue ? '<br><span style="color:red;"><i class="fas fa-exclamation-triangle"></i> मुदत संपली!</span>' : '');
        } else if (book) { info.innerHTML = 'ℹ️ हे पुस्तक वितरित नाही.'; }
        else { info.innerHTML = '<span style="color:red;">❌ पुस्तक सापडले नाही</span>'; }
    });
}
