// ===== Backup & Restore System =====
// JSON बॅकअप - विश्वासार्ह आणि कायमस्वरूपी

// Create Full Backup
async function createBackup() {
    try {
        const data = await exportAllData();

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });

        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-IN', {hour12: false}).replace(/:/g, '-');
        const filename = `DAMC_Library_Backup_${date}_${time}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // Update last backup time
        localStorage.setItem('lastBackupTime', new Date().toISOString());
        updateLastBackupDisplay();

        showNotification(`✅ बॅकअप यशस्वी! फाईल: ${filename}`, 'success');
    } catch (err) {
        showNotification('❌ बॅकअप अयशस्वी: ' + err.message, 'error');
    }
}

// Restore from Backup
async function restoreBackup() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('कृपया बॅकअप फाईल निवडा', 'error');
        return;
    }

    if (!confirm('⚠️ रिस्टोर केल्यावर सध्याचा डेटा बदलला जाईल. पुढे जायचे?')) {
        return;
    }

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate backup file
        if (!data.data || !data.data.books) {
            throw new Error('अमान्य बॅकअप फाईल');
        }

        await importAllData(data);

        showNotification(`✅ रिस्टोर यशस्वी! ${data.data.books.length} पुस्तके, ${data.data.students?.length || 0} विद्यार्थी`, 'success');

        // Refresh dashboard
        updateDashboard();
    } catch (err) {
        showNotification('❌ रिस्टोर अयशस्वी: ' + err.message, 'error');
    }
}

// Auto Backup
function toggleAutoBackup() {
    const enabled = document.getElementById('autoBackup').checked;
    localStorage.setItem('autoBackupEnabled', enabled);

    if (enabled) {
        showNotification('Auto Backup चालू केला. दररोज बॅकअप तयार होईल.', 'success');
        checkAutoBackup();
    } else {
        showNotification('Auto Backup बंद केला.', 'warning');
    }
}

function checkAutoBackup() {
    const enabled = localStorage.getItem('autoBackupEnabled') === 'true';
    if (!enabled) return;

    const lastBackup = localStorage.getItem('lastBackupTime');
    const today = new Date().toISOString().split('T')[0];

    if (!lastBackup || !lastBackup.startsWith(today)) {
        // Auto backup today
        createBackup();
    }
}

function updateLastBackupDisplay() {
    const lastBackup = localStorage.getItem('lastBackupTime');
    const el = document.getElementById('lastBackupTime');
    if (el) {
        if (lastBackup) {
            const d = new Date(lastBackup);
            el.textContent = `शेवटचा बॅकअप: ${d.toLocaleDateString('mr-IN')} ${d.toLocaleTimeString('mr-IN')}`;
        } else {
            el.textContent = 'शेवटचा बॅकअप: कधीच नाही';
        }
    }
}

// Duplicate backup to localStorage as safety net
async function localStorageBackup() {
    try {
        const data = await exportAllData();
        // Only store summary in localStorage (size limit ~5MB)
        const summary = {
            lastUpdate: new Date().toISOString(),
            bookCount: data.data.books.length,
            studentCount: data.data.students.length,
            txnCount: data.data.transactions.length
        };
        localStorage.setItem('libraryDataSummary', JSON.stringify(summary));
    } catch(e) {
        console.error('localStorage backup error:', e);
    }
}
