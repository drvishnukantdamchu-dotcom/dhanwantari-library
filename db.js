// ===== IndexedDB Database for Library Management =====
// 15,000+ पुस्तकांसाठी विश्वासार्ह डेटा स्टोरेज

const DB_NAME = 'DhanwantariLibraryDB';
const DB_VERSION = 1;
let db;

// Database Initialize
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Books Store
            if (!db.objectStoreNames.contains('books')) {
                const bookStore = db.createObjectStore('books', { keyPath: 'accNo' });
                bookStore.createIndex('name', 'name', { unique: false });
                bookStore.createIndex('author', 'author', { unique: false });
                bookStore.createIndex('isbn', 'isbn', { unique: false });
                bookStore.createIndex('category', 'category', { unique: false });
                bookStore.createIndex('status', 'status', { unique: false });
            }

            // Students Store
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'studentId' });
                studentStore.createIndex('name', 'name', { unique: false });
                studentStore.createIndex('year', 'year', { unique: false });
            }

            // Transactions Store
            if (!db.objectStoreNames.contains('transactions')) {
                const txnStore = db.createObjectStore('transactions', { keyPath: 'txnId', autoIncrement: true });
                txnStore.createIndex('bookAccNo', 'bookAccNo', { unique: false });
                txnStore.createIndex('studentId', 'studentId', { unique: false });
                txnStore.createIndex('type', 'type', { unique: false });
                txnStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('✅ Database initialized successfully');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('❌ Database error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// ===== BOOK OPERATIONS =====

// Add Book
function addBook(book) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readwrite');
        const store = txn.objectStore('books');
        book.status = 'available';
        book.dateAdded = new Date().toISOString();
        book.issuedTo = null;
        book.issueDate = null;
        book.dueDate = null;
        book.issueHistory = [];
        const request = store.add(book);
        request.onsuccess = () => resolve(book);
        request.onerror = () => reject(request.error);
    });
}

// Get Book
function getBook(accNo) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readonly');
        const store = txn.objectStore('books');
        const request = store.get(accNo);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update Book
function updateBook(book) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readwrite');
        const store = txn.objectStore('books');
        const request = store.put(book);
        request.onsuccess = () => resolve(book);
        request.onerror = () => reject(request.error);
    });
}

// Delete Book
function deleteBook(accNo) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readwrite');
        const store = txn.objectStore('books');
        const request = store.delete(accNo);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get All Books
function getAllBooks() {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readonly');
        const store = txn.objectStore('books');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Search Books
function searchBooksDB(query, category, status) {
    return new Promise((resolve, reject) => {
        getAllBooks().then(books => {
            let results = books;

            if (query) {
                const q = query.toLowerCase();
                results = results.filter(b =>
                    b.name.toLowerCase().includes(q) ||
                    b.author.toLowerCase().includes(q) ||
                    b.accNo.toLowerCase().includes(q) ||
                    (b.isbn && b.isbn.toLowerCase().includes(q)) ||
                    (b.publisher && b.publisher.toLowerCase().includes(q))
                );
            }

            if (category) {
                results = results.filter(b => b.category === category);
            }

            if (status) {
                results = results.filter(b => b.status === status);
            }

            resolve(results);
        }).catch(reject);
    });
}

// ===== STUDENT OPERATIONS =====

function addStudent(student) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('students', 'readwrite');
        const store = txn.objectStore('students');
        student.dateAdded = new Date().toISOString();
        student.booksIssued = [];
        const request = store.add(student);
        request.onsuccess = () => resolve(student);
        request.onerror = () => reject(request.error);
    });
}

function getStudent(studentId) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('students', 'readonly');
        const store = txn.objectStore('students');
        const request = store.get(studentId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateStudent(student) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('students', 'readwrite');
        const store = txn.objectStore('students');
        const request = store.put(student);
        request.onsuccess = () => resolve(student);
        request.onerror = () => reject(request.error);
    });
}

function getAllStudents() {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('students', 'readonly');
        const store = txn.objectStore('students');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ===== TRANSACTION OPERATIONS =====

function addTransaction(txnData) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('transactions', 'readwrite');
        const store = txn.objectStore('transactions');
        txnData.date = new Date().toISOString();
        txnData.timestamp = Date.now();
        const request = store.add(txnData);
        request.onsuccess = () => resolve(txnData);
        request.onerror = () => reject(request.error);
    });
}

function getAllTransactions() {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('transactions', 'readonly');
        const store = txn.objectStore('transactions');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ===== GET COUNTS =====

function getDashboardCounts() {
    return new Promise(async (resolve) => {
        const books = await getAllBooks();
        const students = await getAllStudents();
        const transactions = await getAllTransactions();

        const today = new Date().toISOString().split('T')[0];
        const todayTxns = transactions.filter(t =>
            t.date && t.date.startsWith(today)
        );

        const overdue = books.filter(b =>
            b.status === 'issued' && b.dueDate && new Date(b.dueDate) < new Date()
        );

        resolve({
            totalBooks: books.length,
            availableBooks: books.filter(b => b.status === 'available').length,
            issuedBooks: books.filter(b => b.status === 'issued').length,
            totalStudents: students.length,
            overdueBooks: overdue.length,
            todayTransactions: todayTxns.length,
            recentTransactions: transactions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
        });
    });
}

// ===== BULK IMPORT =====

function bulkAddBooks(booksArray) {
    return new Promise((resolve, reject) => {
        const txn = db.transaction('books', 'readwrite');
        const store = txn.objectStore('books');
        let added = 0;
        let errors = 0;

        booksArray.forEach(book => {
            book.status = book.status || 'available';
            book.dateAdded = new Date().toISOString();
            book.issuedTo = null;
            book.issueDate = null;
            book.dueDate = null;
            book.issueHistory = [];
            const request = store.put(book); // put = add or update
            request.onsuccess = () => added++;
            request.onerror = () => errors++;
        });

        txn.oncomplete = () => resolve({ added, errors });
        txn.onerror = () => reject(txn.error);
    });
}

// ===== EXPORT ALL DATA =====

async function exportAllData() {
    const books = await getAllBooks();
    const students = await getAllStudents();
    const transactions = await getAllTransactions();
    return {
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        college: 'Dhanwantari Ayurved Medical College, Udgir',
        data: { books, students, transactions }
    };
}

// ===== IMPORT ALL DATA =====

function importAllData(data) {
    return new Promise(async (resolve, reject) => {
        try {
            if (data.data.books) await bulkAddBooks(data.data.books);

            if (data.data.students) {
                const txn = db.transaction('students', 'readwrite');
                const store = txn.objectStore('students');
                data.data.students.forEach(s => store.put(s));
            }

            if (data.data.transactions) {
                const txn = db.transaction('transactions', 'readwrite');
                const store = txn.objectStore('transactions');
                data.data.transactions.forEach(t => store.put(t));
            }

            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
}
