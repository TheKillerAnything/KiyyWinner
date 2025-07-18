document.addEventListener('DOMContentLoaded', function() {
    const deployForm = document.getElementById('deployForm');

    // Check authentication
    checkAuthOrRedirect();

    // Setup form handling
    deployForm.addEventListener('submit', handleDeploy);

    // Add input validations
    setupInputValidations();
});

async function checkAuthOrRedirect() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (!data.loggedIn) {
            window.location.href = '/login';
            return;
        }

        // Show current user
        document.getElementById('currentUser').textContent = data.username;
    } catch (error) {
        window.location.href = '/login';
    }
}

async function handleDeploy(e) {
    e.preventDefault();

    const username = document.getElementById('serverUsername').value.trim();
    const ram = document.getElementById('ram').value;
    const cpu = document.getElementById('cpu').value;

    // Validation
    if (!username || !ram || !cpu) {
        showError('Harap isi semua field dengan benar');
        return;
    }

    if (username.length < 3) {
        showError('Username minimal 3 karakter');
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('Username hanya boleh berisi huruf, angka, dan underscore');
        return;
    }

    setDeployLoading(true);

    try {
        const response = await fetch('/api/server/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username, 
                ram: parseInt(ram), 
                cpu: parseInt(cpu) 
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store server data and redirect to result page
            sessionStorage.setItem('serverData', JSON.stringify(data.server));
            showToast('Server berhasil dibuat! Mengalihkan...');
            setTimeout(() => {
                window.location.href = '/result';
            }, 1500);
        } else {
            showError(data.error || 'Terjadi kesalahan saat deploy');
        }
    } catch (error) {
        showError('Terjadi kesalahan koneksi: ' + error.message);
        console.error('Deploy error:', error);
    } finally {
        setDeployLoading(false);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-xl shadow-lg z-50 max-w-sm';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function setDeployLoading(loading) {
    const deployBtn = document.getElementById('deployBtn');
    const spinner = deployBtn.querySelector('.loading-spinner');
    const text = deployBtn.querySelector('span');

    if (loading) {
        deployBtn.disabled = true;
        deployBtn.classList.add('opacity-75', 'cursor-not-allowed');
        spinner.classList.remove('hidden');
        text.textContent = 'Membuat Server...';
    } else {
        deployBtn.disabled = false;
        deployBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        spinner.classList.add('hidden');
        text.textContent = 'Deploy Server';
    }
}

function setupInputValidations() {
    const inputs = document.querySelectorAll('.form-input');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            validateInput(this);
        });

        input.addEventListener('focus', function() {
            this.classList.remove('ring-red-500', 'ring-2');
            this.classList.add('shadow-2xl', 'shadow-blue-500/20');
            this.parentElement.classList.add('scale-105');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('scale-105');
        });
    });
}

function validateInput(input) {
    const value = input.value.trim();

    if (input.id === 'serverUsername') {
        if (value.length > 0 && value.length < 3) {
            input.classList.add('ring-red-500', 'ring-2');
            input.classList.remove('shadow-blue-500/20');
        } else {
            input.classList.remove('ring-red-500', 'ring-2');
        }
    }

    if (input.id === 'ram' || input.id === 'cpu') {
        const num = parseInt(value);
        if (value && (isNaN(num) || num < 0)) {
            input.classList.add('ring-red-500', 'ring-2');
            input.classList.remove('shadow-blue-500/20');
        } else {
            input.classList.remove('ring-red-500', 'ring-2');
        }
    }

    if (input.id === 'cpu') {
        const num = parseInt(value);
        if (value && num > 100) {
            input.classList.add('ring-red-500', 'ring-2');
            input.classList.remove('shadow-blue-500/20');
        }
    }
}

// Add function to set example values for quick fill
function setExample(type, ram, cpu) {
    document.getElementById('ram').value = ram;
    document.getElementById('cpu').value = cpu;
    
    // Add visual feedback
    const inputs = [document.getElementById('ram'), document.getElementById('cpu')];
    inputs.forEach(input => {
        input.classList.add('ring-2', 'ring-green-400');
        setTimeout(() => {
            input.classList.remove('ring-2', 'ring-green-400');
        }, 1000);
    });
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        window.location.href = '/login';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white`;

    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}