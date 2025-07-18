
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    const loginBtn = document.getElementById('loginBtn');
    
    // Check if already logged in
    checkAuthAndRedirect();
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Add enter key handling
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
});

async function checkAuthAndRedirect() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.loggedIn) {
            window.location.href = '/deploy';
        }
    } catch (error) {
        console.log('Auth check failed:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('Harap isi username dan password');
        return;
    }
    
    setLoading(true);
    hideError();
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Login berhasil! Mengalihkan...');
            setTimeout(() => {
                window.location.href = '/deploy';
            }, 1000);
        } else {
            showError(data.error || 'Login gagal');
        }
    } catch (error) {
        showError('Terjadi kesalahan koneksi');
    } finally {
        setLoading(false);
    }
}

function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMsg.classList.remove('hidden');
    errorMsg.classList.add('animate-pulse');
    
    setTimeout(() => {
        errorMsg.classList.remove('animate-pulse');
    }, 500);
}

function hideError() {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.classList.add('hidden');
}

function showSuccess(message) {
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    
    errorMsg.className = 'bg-green-500/20 border border-green-500 text-green-100 px-4 py-3 rounded-lg mb-6';
    errorText.innerHTML = `<i class="fas fa-check mr-2"></i>${message}`;
}

function setLoading(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const spinner = loginBtn.querySelector('.loading-spinner');
    const text = loginBtn.querySelector('span');
    
    if (loading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('opacity-75', 'cursor-not-allowed');
        spinner.classList.remove('hidden');
        text.textContent = 'Memproses...';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        spinner.classList.add('hidden');
        text.textContent = 'Masuk';
    }
}

// Add input animations
document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('transform', 'scale-105');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('transform', 'scale-105');
    });
});
