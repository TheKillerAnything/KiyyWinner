const express = require('express');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const users = require('./user.js');
const PANEL_CONFIG = require('./config.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'pterodactyl-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Function untuk generate password acak
function generatePassword() {
  return crypto.randomBytes(3).toString('hex');
}

// Function untuk mendapatkan allocation kosong
async function getAvailableAllocation(nodeId) {
  try {
    const response = await axios.get(`${PANEL_CONFIG.url}/api/application/nodes/${nodeId}/allocations`, {
      headers: {
        'Authorization': `Bearer ${PANEL_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });

    const allocations = response.data.data;
    const available = allocations.find(alloc => !alloc.attributes.assigned);

    if (!available) {
      throw new Error('Tidak ada allocation kosong');
    }

    return available.attributes;
  } catch (error) {
    console.error('Error getting allocation:', error.message);
    throw error;
  }
}

// Function untuk membuat user baru
async function createUser(username, password) {
  try {
    const userData = {
      email: `${username}@generated.local`,
      username: username,
      first_name: username,
      last_name: 'User',
      password: password
    };

    const response = await axios.post(`${PANEL_CONFIG.url}/api/application/users`, userData, {
      headers: {
        'Authorization': `Bearer ${PANEL_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });

    return response.data.attributes;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
}

// Function untuk membuat server
async function createServer(userId, username, allocation, ram, cpu) {
  try {
    const serverData = {
      name: `Server-${username}`,
      user: userId,
      egg: PANEL_CONFIG.eggId,
      docker_image: PANEL_CONFIG.dockerImage,
      startup: PANEL_CONFIG.environment.STARTUP,
      environment: PANEL_CONFIG.environment,
      limits: {
        memory: ram === 0 ? 999999 : ram,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: cpu === 0 ? 999999 : cpu
      },
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0
      },
      allocation: {
        default: allocation.id
      }
    };

    const response = await axios.post(`${PANEL_CONFIG.url}/api/application/servers`, serverData, {
      headers: {
        'Authorization': `Bearer ${PANEL_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });

    return response.data.attributes;
  } catch (error) {
    console.error('Error creating server:', error.message);
    throw error;
  }
}

// API Routes
app.get('/api/auth/check', (req, res) => {
  res.json({ loggedIn: !!req.session.loggedIn, username: req.session.username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(([u, p]) => u === username && p === password);

  if (user) {
    req.session.loggedIn = true;
    req.session.username = username;
    res.json({ success: true, username });
  } else {
    res.status(401).json({ success: false, error: 'Username atau password salah' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.post('/api/server/create', async (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { username, ram, cpu } = req.body;

    const ramMB = ram == 0 ? 999999 : parseInt(ram) * 1024;
    const cpuPercent = cpu == 0 ? 999999 : parseInt(cpu);
    const password = generatePassword();

    const allocation = await getAvailableAllocation(PANEL_CONFIG.nodeId);
    const user = await createUser(username, password);
    const server = await createServer(user.id, username, allocation, ramMB, cpuPercent);

    res.json({
      success: true,
      server: {
        id: server.id,
        username,
        password,
        ip: allocation.ip,
        port: allocation.port,
        ram: ram == 0 ? 'Unlimited' : ram + ' GB',
        cpu: cpu == 0 ? 'Unlimited' : cpu + '%'
      }
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/deploy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deploy.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pterodactyl Auto Deploy berjalan di http://0.0.0.0:${PORT}`);
  console.log('📝 Konfigurasi panel berhasil dimuat dari config.js');
});