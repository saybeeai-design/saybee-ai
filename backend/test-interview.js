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
  const loginData = JSON.stringify({ email: 'neon-test@example.com', password: 'password123' });
  const loginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, loginData);
  const token = JSON.parse(loginRes.data).token;

  // Let's test the interview engine
  let interviewId;
  const startIntData = JSON.stringify({ resumeId: '', category: 'Software Engineer', language: 'English' });
  const startIntRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/interviews/start', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(startIntData), 'Authorization': `Bearer ${token}` }
  }, startIntData);
  console.log('Start Interview:', startIntRes.statusCode, startIntRes.data);
  interviewId = JSON.parse(startIntRes.data).interview?.id;
  
  if (interviewId) {
    const genQData = JSON.stringify({ speakQuestion: false });
    const genQRes = await request({
      hostname: 'localhost', port: 5000, path: `/api/interviews/${interviewId}/generate-question`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(genQData), 'Authorization': `Bearer ${token}` }
    }, genQData);
    console.log('Generate Question:', genQRes.statusCode, genQRes.data.substring(0, 100) + '...');
  }
}
runTests();
