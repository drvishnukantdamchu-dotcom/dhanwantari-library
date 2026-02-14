// ===== Enhanced IndexedDB Database =====
// Designed by Dr. Jadhav V.R. (9518356305)

var DB_NAME = 'DhanwantariLibraryDB';
var DB_VERSION = 2;
var db;

function initDB() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            var database = event.target.result;

            if (!database.objectStoreNames.contains('books')) {
                var bookStore = database.createObjectStore('books', { keyPath: 'accNo' });
                bookStore.createIndex('name', 'name', { unique: false });
                bookStore.createIndex('author', 'author', { unique: false });
                bookStore.createIndex('isbn', 'isbn', { unique: false });
                bookStore.createIndex('category', 'category', { unique: false });
                bookStore.createIndex('status', 'status', { unique: false });
            }

            if (!database.objectStoreNames.contains('students')) {
                var studentStore = database.createObjectStore('students', { keyPath: 'studentId' });
                studentStore.createIndex('name', 'name', { unique: false });
                studentStore.createIndex('year', 'year', { unique: false });
            }

            if (!database.objectStoreNames.contains('transactions')) {
                var txnStore = database.createObjectStore('transactions', { keyPath: 'txnId', autoIncrement: true });
                txnStore.createIndex('bookAccNo', 'bookAccNo', { unique: false });
                txnStore.createIndex('studentId', 'studentId', { unique: false });
                txnStore.createIndex('type', 'type', { unique: false });
                txnStore.createIndex('date', 'date', { unique: false });
            }

            if (!database.objectStoreNames.contains('messages')) {
                var msgStore = database.createObjectStore('messages', { keyPath: 'msgId', autoIncrement: true });
                msgStore.createIndex('to', 'to', { unique: false });
                msgStore.createIndex('from', 'from', { unique: false });
                msgStore.createIndex('date', 'date', { unique: false });
                msgStore.createIndex('read', 'read', { unique: false });
            }

            if (!database.objectStoreNames.contains('notices')) {
                var noticeStore = database.createObjectStore('notices', { keyPath: 'noticeId', autoIncrement: true });
                noticeStore.createIndex('type', 'type', { unique: false });
                noticeStore.createIndex('date', 'date', { unique: false });
            }

            if (!database.objectStoreNames.contains('files')) {
                var fileStore = database.createObjectStore('files', { keyPath: 'fileId', autoIncrement: true });
                fileStore.createIndex('target', 'target', { unique: false });
                fileStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('Database initialized successfully');
            resolve(db);
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// ===== GENERIC DB HELPERS =====

function dbAdd(storeName, data) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readwrite');
        var store = txn.objectStore(storeName);
        var request = store.add(data);
        request.onsuccess = function() { resolve(data); };
        request.onerror = function() { reject(request.error); };
    });
}

function dbPut(storeName, data) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readwrite');
        var store = txn.objectStore(storeName);
        var request = store.put(data);
        request.onsuccess = function() { resolve(data); };
        request.onerror = function() { reject(request.error); };
    });
}

function dbGet(storeName, key) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readonly');
        var store = txn.objectStore(storeName);
        var request = store.get(key);
        request.onsuccess = function() { resolve(request.result); };
        request.onerror = function() { reject(request.error); };
    });
}

function dbGetAll(storeName) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readonly');
        var store = txn.objectStore(storeName);
        var request = store.getAll();
        request.onsuccess = function() { resolve(request.result); };
        request.onerror = function() { reject(request.error); };
    });
}

function dbDelete(storeName, key) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readwrite');
        var store = txn.objectStore(storeName);
        var request = store.delete(key);
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
    });
}

function dbCount(storeName) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction(storeName, 'readonly');
        var store = txn.objectStore(storeName);
        var request = store.count();
        request.onsuccess = function() { resolve(request.result); };
        request.onerror = function() { reject(request.error); };
    });
}

// ===== BOOK OPERATIONS =====

function addBook(book) {
    book.status = 'available';
    book.dateAdded = new Date().toISOString();
    book.issuedTo = null;
    book.issuedToName = null;
    book.issueDate = null;
    book.dueDate = null;
    book.issueHistory = [];
    book.issueCount = 0;
    return dbAdd('books', book);
}

function getBook(accNo) { return dbGet('books', accNo); }
function updateBook(book) { return dbPut('books', book); }
function deleteBook(accNo) { return dbDelete('books', accNo); }
function getAllBooks() { return dbGetAll('books'); }

function searchBooksDB(query, category, status) {
    return getAllBooks().then(function(books) {
        var results = books;
        if (query) {
            var q = query.toLowerCase();
            results = results.filter(function(b) {
                return b.name.toLowerCase().includes(q) ||
                    b.author.toLowerCase().includes(q) ||
                    b.accNo.toLowerCase().includes(q) ||
                    (b.isbn && b.isbn.toLowerCase().includes(q)) ||
                    (b.publisher && b.publisher.toLowerCase().includes(q));
            });
        }
        if (category) {
            results = results.filter(function(b) { return b.category === category; });
        }
        if (status) {
            results = results.filter(function(b) { return b.status === status; });
        }
        return results;
    });
}

// ===== STUDENT OPERATIONS =====

function addStudent(student) {
    student.dateAdded = new Date().toISOString();
    student.booksIssued = [];
    student.totalBooksIssued = 0;
    student.messages = [];
    return dbAdd('students', student);
}

function getStudent(studentId) { return dbGet('students', studentId); }
function updateStudent(student) { return dbPut('students', student); }
function deleteStudent(studentId) { return dbDelete('students', studentId); }
function getAllStudents() { return dbGetAll('students'); }

// ===== TRANSACTION OPERATIONS =====

function addTransaction(txnData) {
    txnData.date = new Date().toISOString();
    txnData.timestamp = Date.now();
    return dbAdd('transactions', txnData);
}

function getAllTransactions() { return dbGetAll('transactions'); }

// ===== MESSAGE OPERATIONS =====

function addMessage(msgData) {
    msgData.date = new Date().toISOString();
    msgData.timestamp = Date.now();
    msgData.read = false;
    msgData.reply = null;
    msgData.replyDate = null;
    return dbAdd('messages', msgData);
}

function getAllMessages() { return dbGetAll('messages'); }
function updateMessage(msg) { return dbPut('messages', msg); }

// ===== NOTICE OPERATIONS =====

function addNotice(notice) {
    notice.date = new Date().toISOString();
    notice.timestamp = Date.now();
    notice.active = true;
    return dbAdd('notices', notice);
}

function getAllNotices() { return dbGetAll('notices'); }
function updateNotice(notice) { return dbPut('notices', notice); }
function deleteNotice(id) { return dbDelete('notices', id); }

// ===== FILE OPERATIONS =====

function addSharedFile(fileData) {
    fileData.date = new Date().toISOString();
    fileData.timestamp = Date.now();
    return dbAdd('files', fileData);
}

function getAllSharedFiles() { return dbGetAll('files'); }
function deleteSharedFile(id) { return dbDelete('files', id); }

// ===== DASHBOARD COUNTS =====

function getDashboardCounts() {
    return new Promise(async function(resolve) {
        try {
            var books = await getAllBooks();
            var students = await getAllStudents();
            var transactions = await getAllTransactions();
            var messages = await getAllMessages();
            var notices = await getAllNotices();

            var today = new Date().toISOString().split('T')[0];
            var todayTxns = transactions.filter(function(t) {
                return t.date && t.date.startsWith(today);
            });

            var overdue = books.filter(function(b) {
                return b.status === 'issued' && b.dueDate && new Date(b.dueDate) < new Date();
            });

            var faculty = students.filter(function(s) {
                return s.year === 'Faculty' || s.year === 'Staff';
            });

            var unreadMsgs = messages.filter(function(m) { return !m.read; });

            resolve({
                totalBooks: books.length,
                availableBooks: books.filter(function(b) { return b.status === 'available'; }).length,
                issuedBooks: books.filter(function(b) { return b.status === 'issued'; }).length,
                totalStudents: students.length,
                overdueBooks: overdue.length,
                todayTransactions: todayTxns.length,
                totalFaculty: faculty.length,
                totalMessages: unreadMsgs.length,
                recentTransactions: transactions.sort(function(a, b) { return b.timestamp - a.timestamp; }).slice(0, 20),
                recentNotices: notices.sort(function(a, b) { return b.timestamp - a.timestamp; }).slice(0, 5),
                overdueList: overdue
            });
        } catch (err) {
            console.error('getDashboardCounts error:', err);
            resolve({
                totalBooks: 0, availableBooks: 0, issuedBooks: 0,
                totalStudents: 0, overdueBooks: 0, todayTransactions: 0,
                totalFaculty: 0, totalMessages: 0,
                recentTransactions: [], recentNotices: [], overdueList: []
            });
        }
    });
}

// ===== BULK IMPORT =====

function bulkAddBooks(booksArray) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction('books', 'readwrite');
        var store = txn.objectStore('books');
        var added = 0;
        var errors = 0;

        booksArray.forEach(function(book) {
            book.status = book.status || 'available';
            book.dateAdded = new Date().toISOString();
            book.issuedTo = null;
            book.issuedToName = null;
            book.issueDate = null;
            book.dueDate = null;
            book.issueHistory = book.issueHistory || [];
            book.issueCount = 0;
            var request = store.put(book);
            request.onsuccess = function() { added++; };
            request.onerror = function() { errors++; };
        });

        txn.oncomplete = function() { resolve({ added: booksArray.length - errors, errors: errors }); };
        txn.onerror = function() { reject(txn.error); };
    });
}

function bulkAddStudents(studentsArray) {
    return new Promise(function(resolve, reject) {
        var txn = db.transaction('students', 'readwrite');
        var store = txn.objectStore('students');
        var errors = 0;

        studentsArray.forEach(function(student) {
            student.dateAdded = new Date().toISOString();
            student.booksIssued = student.booksIssued || [];
            student.totalBooksIssued = 0;
            student.messages = [];
            var request = store.put(student);
            request.onerror = function() { errors++; };
        });

        txn.oncomplete = function() { resolve({ added: studentsArray.length - errors, errors: errors }); };
        txn.onerror = function() { reject(txn.error); };
    });
}

// ===== EXPORT ALL DATA =====

async function exportAllData() {
    var books = await getAllBooks();
    var students = await getAllStudents();
    var transactions = await getAllTransactions();
    var messages = await getAllMessages();
    var notices = await getAllNotices();
    var files = await getAllSharedFiles();
    return {
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        college: 'Dhanwantari Ayurved Medical College, Udgir',
        developer: 'Dr. Jadhav V.R. (9518356305)',
        data: { books: books, students: students, transactions: transactions, messages: messages, notices: notices, files: files }
    };
}

// ===== IMPORT ALL DATA =====

async function importAllData(data) {
    try {
        if (data.data.books) await bulkAddBooks(data.data.books);
        if (data.data.students) await bulkAddStudents(data.data.students);
        if (data.data.transactions) {
            var txn = db.transaction('transactions', 'readwrite');
            var store = txn.objectStore('transactions');
            data.data.transactions.forEach(function(t) { store.put(t); });
        }
        if (data.data.messages) {
            var txn2 = db.transaction('messages', 'readwrite');
            var store2 = txn2.objectStore('messages');
            data.data.messages.forEach(function(m) { store2.put(m); });
        }
        if (data.data.notices) {
            var txn3 = db.transaction('notices', 'readwrite');
            var store3 = txn3.objectStore('notices');
            data.data.notices.forEach(function(n) { store3.put(n); });
        }
        return true;
    } catch (err) {
        throw err;
    }
}
