const http = require('http');

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

async function runTests() {
  console.log('Testing /api/health...');
  const healthRes = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('Health:', healthRes.statusCode, healthRes.data);

  console.log('Testing /api/auth/signup...');
  const signupData = JSON.stringify({ email: 'neon-test@example.com', password: 'password123', name: 'Neon Tester' });
  const signupRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/signup', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signupData) }
  }, signupData);
  console.log('Signup:', signupRes.statusCode, signupRes.data);

  const loginData = JSON.stringify({ email: 'neon-test@example.com', password: 'password123' });
  const loginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, loginData);
  console.log('Login:', loginRes.statusCode, loginRes.data);
  
  if (loginRes.statusCode === 200) {
    const tokenBytes = JSON.parse(loginRes.data).token;
    console.log('Testing /api/users/profile...');
    const profileRes = await request({
      hostname: 'localhost', port: 5000, path: '/api/users/profile', method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenBytes}` }
    });
    console.log('Profile:', profileRes.statusCode, profileRes.data);
  } else {
    console.log('Skipping profile test due to login failure. (Might be already signed up)');
  }
}

setTimeout(runTests, 2000);
